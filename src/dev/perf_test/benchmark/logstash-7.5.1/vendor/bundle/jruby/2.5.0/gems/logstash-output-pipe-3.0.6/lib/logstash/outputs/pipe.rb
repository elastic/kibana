# encoding: utf-8
require "logstash/namespace"
require "logstash/outputs/base"

# Pipe output.
#
# Pipe events to stdin of another program. You can use fields from the
# event as parts of the command.
# WARNING: This feature can cause logstash to fork off multiple children if you are not carefull with per-event commandline.
class LogStash::Outputs::Pipe < LogStash::Outputs::Base

  config_name "pipe"

  # The format to use when writing events to the pipe. This value
  # supports any string and can include `%{name}` and other dynamic
  # strings.
  #
  # If this setting is omitted, the full json representation of the
  # event will be written as a single line.
  config :message_format, :validate => :string

  # Command line to launch and pipe to
  config :command, :validate => :string, :required => true

  # Close pipe that hasn't been used for TTL seconds. -1 or 0 means never close.
  config :ttl, :validate => :number, :default => 10
  public
  def register
    @pipes = {}
    @last_stale_cleanup_cycle = Time.now
  end # def register

  public
  def receive(event)
    

    command = event.sprintf(@command)

    if @message_format
      output = event.sprintf(@message_format) + "\n"
    else
      output = event.to_json
    end

    begin
      pipe = get_pipe(command)
      pipe.puts(output)
    rescue IOError, Errno::EPIPE, Errno::EBADF => e
      @logger.error("Error writing to pipe, closing pipe.", :command => command, :pipe => pipe)
      drop_pipe(command)
      retry
    end

    close_stale_pipes
  end # def receive

  def close
    @logger.info("close: closing pipes")
    @pipes.each do |command, pipe|
      begin
        drop_pipe(command)
        @logger.debug("Closed pipe #{command}", :pipe => pipe)
      rescue Exception => e
        @logger.error("Excpetion while closing pipes.", :exception => e)
      end
    end
  end

  private
  # every 10 seconds or so (triggered by events, but if there are no events there's no point closing files anyway)
  def close_stale_pipes
    return if @ttl <= 0
    now = Time.now
    return unless now - @last_stale_cleanup_cycle >= @ttl
    @logger.info("Starting stale pipes cleanup cycle", :pipes => @pipes)
    inactive_pipes = @pipes.select { |command, pipe| not pipe.active }
    @logger.debug("%d stale pipes found" % inactive_pipes.count, :inactive_pipes => inactive_pipes)
    inactive_pipes.each do |command, pipe|
      drop_pipe(command)
    end
    # mark all pipes as inactive, a call to write will mark them as active again
    @pipes.each { |command, pipe| pipe.active = false }
    @last_stale_cleanup_cycle = now
  end

  def drop_pipe(command)
      return unless @pipes.include? command
      @logger.info("Closing pipe \"%s\"" % command)
      begin
        @pipes[command].close
      rescue Exception => e
        @logger.warn("Failed to close pipe.", :error => e, :command => command)
      end
      @pipes.delete(command)
  end

  def get_pipe(command)
    return @pipes[command] if @pipes.include?(command)

    @logger.info("Opening pipe", :command => command)

    @pipes[command] = PipeWrapper.new(command, mode="a+")
  end
end # class LogStash::Outputs::Pipe

class PipeWrapper
  attr_accessor :active
  def initialize(command, mode="a+")
    @pipe = IO.popen(command, mode)
    @active = false
  end

  def method_missing(m, *args)
    if @pipe.respond_to? m
      @pipe.send(m, *args)
    else
      raise NoMethodError
    end
  end

  def puts(txt)
    @pipe.puts(txt)
    @pipe.flush
    @active = true
  end

  def write(txt)
    @pipe.write(txt)
    @active = true
  end
end
