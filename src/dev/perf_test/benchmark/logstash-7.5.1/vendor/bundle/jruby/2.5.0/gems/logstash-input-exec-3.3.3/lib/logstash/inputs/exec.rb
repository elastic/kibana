# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "socket" # for Socket.gethostname
require "stud/interval"
require "rufus/scheduler"

# Periodically run a shell command and capture the whole output as an event.
#
# Notes:
#
# * The `command` field of this event will be the command run.
# * The `message` field of this event will be the entire stdout of the command.
#
class LogStash::Inputs::Exec < LogStash::Inputs::Base

  config_name "exec"

  default :codec, "plain"

  # Command to run. For example : `uptime`
  config :command, :validate => :string, :required => true

  # Interval to run the command. Value is in seconds.
  # Either `interval` or `schedule` option must be defined.
  config :interval, :validate => :number

  # Schedule of when to periodically run command, in Cron format
  # For example: "* * * * *" (execute command every minute, on the minute)
  # Either `interval` or `schedule` option must be defined.
  config :schedule, :validate => :string

  def register
    @logger.info("Registering Exec Input", :type => @type, :command => @command, :interval => @interval, :schedule => @schedule)
    @hostname = Socket.gethostname
    @io       = nil
    
    if (@interval.nil? && @schedule.nil?) || (@interval && @schedule)
      raise LogStash::ConfigurationError, "exec input: either 'interval' or 'schedule' option must be defined."
    end
  end # def register

  def run(queue)
    if @schedule
      @scheduler = Rufus::Scheduler.new(:max_work_threads => 1)
      @scheduler.cron @schedule do
        execute(queue)
      end
      @scheduler.join
    else
      while !stop?
        duration = execute(queue)
        wait_until_end_of_interval(duration)
      end # loop
    end
  end # def run

  def stop
    close_io()
    @scheduler.shutdown(:wait) if @scheduler
  end

  # Execute a given command
  # @param [String] A command string
  # @param [Array or Queue] A queue to append events to
  def execute(queue)
    start = Time.now
    output = exit_status = nil
    begin
      @logger.debug? && @logger.debug("Running exec", :command => @command)
      output, exit_status = run_command()
    rescue StandardError => e
      @logger.error("Error while running command",
        :command => @command, :e => e, :backtrace => e.backtrace)
    rescue Exception => e
      @logger.error("Exception while running command",
        :command => @command, :e => e, :backtrace => e.backtrace)
    end
    duration = Time.now - start
    @logger.debug? && @logger.debug("Command completed", :command => @command, :duration => duration)
    if output
      @codec.decode(output) do |event|
        decorate(event)
        event.set("host", @hostname)
        event.set("command", @command)
        event.set("[@metadata][duration]", duration)
        event.set("[@metadata][exit_status]", exit_status)
        queue << event
      end
    end
    duration
  end

  private

  def run_command
    @io = IO.popen(@command)
    output = @io.read
    @io.close # required in order to read $?
    exit_status = $?.exitstatus # should be threadsafe as per rb_thread_save_context
    [output, exit_status]
  ensure
    close_io()
  end

  # Close @io
  def close_io
    return if @io.nil? || @io.closed?
    @io.close
    @io = nil
  end

  # Wait until the end of the interval
  # @param [Integer] the duration of the last command executed
  def wait_until_end_of_interval(duration)
    # Sleep for the remainder of the interval, or 0 if the duration ran
    # longer than the interval.
    sleeptime = [0, @interval - duration].max
    if sleeptime > 0
      Stud.stoppable_sleep(sleeptime) { stop? }
    else
      @logger.warn("Execution ran longer than the interval. Skipping sleep.",
                   :command => @command, :duration => duration, :interval => @interval)
    end
  end


end # class LogStash::Inputs::Exec
