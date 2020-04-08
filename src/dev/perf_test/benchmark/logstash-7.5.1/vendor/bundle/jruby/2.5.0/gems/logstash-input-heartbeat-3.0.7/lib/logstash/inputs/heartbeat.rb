# encoding: utf-8
require "logstash/inputs/threadable"
require "logstash/namespace"
require "stud/interval"
require "socket" # for Socket.gethostname

# Generate heartbeat messages.
#
# The general intention of this is to test the performance and
# availability of Logstash.
#

class LogStash::Inputs::Heartbeat < LogStash::Inputs::Threadable
  config_name "heartbeat"

  default :codec, "plain"

  # The message string to use in the event.
  #
  # If you set this to `epoch` then this plugin will use the current
  # timestamp in unix timestamp (which is by definition, UTC).  It will
  # output this value into a field called `clock`
  #
  # If you set this to `sequence` then this plugin will send a sequence of
  # numbers beginning at 0 and incrementing each interval.  It will
  # output this value into a field called `clock`
  #
  # Otherwise, this value will be used verbatim as the event message. It
  # will output this value into a field called `message`
  config :message, :validate => :string, :default => "ok"

  # Set how frequently messages should be sent.
  #
  # The default, `60`, means send a message every 60 seconds.
  config :interval, :validate => :number, :default => 60

  # How many times to iterate.
  # This is typically used only for testing purposes.
  config :count, :validate => :number, :default => -1

  def register
    @host = Socket.gethostname
  end

  def run(queue)
    sequence = 0

    while !stop?
      start = Time.now

      sequence += 1
      event = generate_message(sequence)
      decorate(event)
      queue << event
      break if sequence == @count || stop?

      sleep_for = @interval - (Time.now - start)
      Stud.stoppable_sleep(sleep_for) { stop? } if sleep_for > 0
    end
  end

  def generate_message(sequence)
    if @message == "epoch"
      LogStash::Event.new("clock" => Time.now.to_i, "host" => @host)
    elsif @message == "sequence"
      LogStash::Event.new("clock" => sequence, "host" => @host)
    else
      LogStash::Event.new("message" => @message, "host" => @host)
    end
  end
end
