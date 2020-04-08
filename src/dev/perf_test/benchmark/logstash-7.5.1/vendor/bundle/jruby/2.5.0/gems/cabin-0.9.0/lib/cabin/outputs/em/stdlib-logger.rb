require "cabin"
require "eventmachine"

# Wrap Ruby stdlib's logger and make it EventMachine friendly. This
# allows you to output to a normal ruby logger with Cabin.
class Cabin::Outputs::EM::StdlibLogger
  public
  def initialize(logger)
    @logger_queue = EM::Queue.new
    @logger = logger
    # Consume log lines from a queue and send them with logger
    consumer
  end

  def consumer
    line_sender = Proc.new do |line|
      # This will call @logger.info(data) or something similar
      @logger.send(line[:method], line[:message])
      EM::next_tick do
        # Pop another line off the queue and do it again
        @logger_queue.pop(&line_sender)
      end
    end
    # Pop a line off the queue and send it with logger
    @logger_queue.pop(&line_sender)
  end

  # Receive an event
  public
  def <<(data)
    line = Hash.new
    line[:method] = data[:level] || "info"
    line[:message] = "#{data[:message]} #{data.inspect}"
    if EM::reactor_running?
      # Push line onto queue for later sending
      @logger_queue.push(line)
    else
      # This will call @logger.info(data) or something similar
      @logger.send(line[:method], line[:message])
    end
  end
end
