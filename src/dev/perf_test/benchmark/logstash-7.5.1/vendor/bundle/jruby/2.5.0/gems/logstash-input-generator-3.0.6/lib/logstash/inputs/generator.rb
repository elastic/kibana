# encoding: utf-8
require "logstash/inputs/threadable"
require "logstash/namespace"
require "socket" # for Socket.gethostname

# Generate random log events.
#
# The general intention of this is to test performance of plugins.
#
# An event is generated first
class LogStash::Inputs::Generator < LogStash::Inputs::Threadable
  config_name "generator"

  default :codec, "plain"

  # The message string to use in the event.
  #
  # If you set this to `stdin` then this plugin will read a single line from
  # stdin and use that as the message string for every event.
  #
  # Otherwise, this value will be used verbatim as the event message.
  config :message, :validate => :string, :default => "Hello world!"

  # The lines to emit, in order. This option cannot be used with the 'message'
  # setting.
  #
  # Example:
  # [source,ruby]
  #     input {
  #       generator {
  #         lines => [
  #           "line 1",
  #           "line 2",
  #           "line 3"
  #         ]
  #         # Emit all lines 3 times.
  #         count => 3
  #       }
  #     }
  #
  # The above will emit `line 1` then `line 2` then `line`, then `line 1`, etc...
  config :lines, :validate => :array

  # Set how many messages should be generated.
  #
  # The default, `0`, means generate an unlimited number of events.
  config :count, :validate => :number, :default => 0

  public
  def register
    @host = Socket.gethostname
    @count = Array(@count).first
  end # def register

  def run(queue)
    number = 0

    if @message == "stdin"
      @logger.info("Generator plugin reading a line from stdin")
      @message = $stdin.readline
      @logger.debug("Generator line read complete", :message => @message)
    end
    @lines = [@message] if @lines.nil?

    while !stop? && (@count <= 0 || number < @count)
      @lines.each do |line|
        @codec.decode(line.clone) do |event|
          decorate(event)
          event.set("host", @host)
          event.set("sequence", number)
          queue << event
        end
      end
      number += 1
    end # loop

    if @codec.respond_to?(:flush)
      @codec.flush do |event|
        decorate(event)
        event.set("host", @host)
        queue << event
      end
    end
  end # def run

  public
  def close
    if @codec.respond_to?(:flush)
      @codec.flush do |event|
        decorate(event)
        event.set("host", @host)
        queue << event
      end
    end
  end # def close
end # class LogStash::Inputs::Generator
