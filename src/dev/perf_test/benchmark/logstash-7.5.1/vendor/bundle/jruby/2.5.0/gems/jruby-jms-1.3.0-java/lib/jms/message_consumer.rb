# Interface javax.jms.MessageConsumer
module JMS::MessageConsumer
  # Obtain a message from the Destination or Topic
  # In JMS terms, the message is received from the Destination
  # :timeout follows the rules for MQSeries:
  #   -1 : Wait forever
  #    0 : Return immediately if no message is available
  #    x : Wait for x milli-seconds for a message to be received from the broker
  #         Note: Messages may still be on the queue, but the broker has not supplied any messages
  #                   in the time interval specified
  #    Default: 0
  # :buffered_message - consume Oracle AQ buffered message
  #    Default: false
  def get(params={})
    timeout = params[:timeout] || 0
    buffered_message = params[:buffered_message] || false
    if timeout == -1
       if buffered_message
         self.bufferReceive
       else
         self.receive
       end
    elsif timeout == 0
       if buffered_message
         self.bufferReceiveNoWait
       else
         self.receiveNoWait
       end
    else
       if buffered_message
         self.bufferReceive(timeout)
       else
         self.receive(timeout)
       end
    end
  end

  # For each message available to be consumed call the supplied block
  # Returns the statistics gathered when statistics: true, otherwise nil
  #
  # Parameters:
  #   :timeout How to timeout waiting for messages on the Queue or Topic
  #     -1 : Wait forever
  #      0 : Return immediately if no message is available
  #      x : Wait for x milli-seconds for a message to be received from the broker
  #           Note: Messages may still be on the queue, but the broker has not supplied any messages
  #                     in the time interval specified
  #      Default: 0
  #
  #   :statistics Capture statistics on how many messages have been read
  #      true  : This method will capture statistics on the number of messages received
  #              and the time it took to process them.
  #              The statistics can be reset by calling MessageConsumer::each again
  #              with statistics: true
  #
  #              The statistics gathered are returned when statistics: true and async: false
  def each(params={}, &block)
    raise(ArgumentError, 'Destination::each requires a code block to be executed for each message received') unless block

    message_count = nil
    start_time    = nil

    if params[:statistics]
      message_count = 0
      start_time    = Time.now
    end

    # Receive messages according to timeout
    while message = self.get(params) do
      block.call(message)
      message_count += 1 if message_count
    end

    unless message_count.nil?
      duration = Time.now - start_time
      {
        messages:            message_count,
        duration:            duration,
        messages_per_second: duration > 0 ? (message_count/duration).to_i : 0,
        ms_per_msg:          message_count > 0 ? (duration*1000.0)/message_count : 0
      }
    end
  end

  # Receive messages in a separate thread when they arrive
  # Allows messages to be recieved in a separate thread. I.e. Asynchronously
  # This method will return to the caller before messages are processed.
  # It is then the callers responsibility to keep the program active so that messages
  # can then be processed.
  #
  # Parameters:
  #   :statistics Capture statistics on how many messages have been read
  #      true  : This method will capture statistics on the number of messages received
  #              and the time it took to process them.
  #              The timer starts when each() is called and finishes when either the last message was received,
  #              or when Destination::statistics is called. In this case MessageConsumer::statistics
  #              can be called several times during processing without affecting the end time.
  #              Also, the start time and message count is not reset until MessageConsumer::each
  #              is called again with statistics: true
  #
  #              The statistics gathered are returned when statistics: true and async: false
  #
  def on_message(params={}, &proc)
    raise(ArgumentError, 'MessageConsumer::on_message requires a code block to be executed for each message received') unless proc

    # Turn on Java class persistence: https://github.com/jruby/jruby/wiki/Persistence
    self.class.__persistent__ = true

    @listener = JMS::MessageListenerImpl.new(params, &proc)
    self.setMessageListener(@listener)
  end

  # Return the current statistics for a running MessageConsumer::on_message
  def on_message_statistics
    stats = @listener.statistics if @listener
    raise(ArgumentError, 'First call MessageConsumer::on_message with statistics: true before calling MessageConsumer::statistics()') unless stats
    stats
  end

end
