# For each thread that will be processing messages concurrently a separate
# session is required. All sessions can share a single connection to the same
# JMS Provider.
#
# Interface javax.jms.Session
#
# See: http://download.oracle.com/javaee/6/api/javax/jms/Session.html
#
# Other methods still directly accessible through this class:
#
# create_browser(queue, message_selector)
#   Creates a QueueBrowser object to peek at the messages on the specified queue using a message selector.
#
# create_bytes_message()
#   Creates a BytesMessage object
#
# create_consumer(destination)
#   Creates a MessageConsumer for the specified destination
#   See: Connection::consumer
#
#   Example:
#      destination = session.create_destination(queue_name: "MyQueue")
#      session.create_consumer(destination)
#
#	create_consumer(destination, message_selector)
#   Creates a MessageConsumer for the specified destination, using a message selector
#
#	create_consumer(destination, message_selector, boolean NoLocal)
#   Creates MessageConsumer for the specified destination, using a message selector
#
# create_durable_subscriber(Topic topic, java.lang.String name)
#   Creates a durable subscriber to the specified topic
#
# create_durable_subscriber(Topic topic, java.lang.String name, java.lang.String messageSelector, boolean noLocal)
#   Creates a durable subscriber to the specified topic, using a message selector and specifying whether messages published by its own connection should be delivered to it.
#
#	create_map_Message()
#   Creates a MapMessage object
#
#	create_message()
#   Creates a Message object
#
# create_object_message()
#   Creates an ObjectMessage object
#
# create_object_message(java.io.Serializable object)
#   Creates an initialized ObjectMessage object
#
#	create_producer(destination)
#   Creates a MessageProducer to send messages to the specified destination
#
# create_queue(queue_name)
#   Creates a queue identity given a Queue name
#
# create_stream_message()
#   Creates a StreamMessage object
#
#	create_temporary_queue()
#   Creates a TemporaryQueue object
#
#	create_temporary_topic()
#   Creates a TemporaryTopic object
#
#	create_text_message()
#   Creates a TextMessage object
#
#	create_text_message(text)
#   Creates an initialized TextMessage object
#
# create_topic(topic_name)
#   Creates a topic identity given a Topic name
#
# acknowledge_mode()
#   Returns the acknowledgement mode of the session
#
#	message_listener()
#   Returns the session's distinguished message listener (optional).
#
# transacted?
#   Indicates whether the session is in transacted mode
#
# recover()
#   Stops message delivery in this session, and restarts message delivery with the oldest unacknowledged message
#
# rollback()
#   Rolls back any messages done in this transaction and releases any locks currently held
#
# message_listener=(MessageListener listener)
#   Sets the session's distinguished message listener (optional)
#
# unsubscribe(name)
#   Unsubscribes a durable subscription that has been created by a client
#
# Interface javax.jms.Session
module JMS::Session
  # Create a new message instance based on the type of the data being supplied
  #   String (:to_str)    => TextMessage
  #   Hash   (:each_pair) => MapMessage
  # Duck typing is used to determine the type. If the class responds
  # to :to_str then it is considered a String. Similarly if it responds to
  # :each_pair it is considered to be a Hash
  #
  # If automated duck typing is not desired, the type of the message can be specified
  # by setting the parameter 'type' to any one of:
  #    text:   Creates a Text Message
  #    map:    Creates a Map Message
  #    bytes:  Creates a Bytes Message
  def message(data, type=nil)
    jms_message = nil
    type        ||=
      if data.respond_to?(:to_str, false)
        :text
      elsif data.respond_to?(:each_pair, false)
        :map
      else
        raise "Unknown data type #{data.class.to_s} in Message"
      end

    case type
    when :text
      jms_message      = self.createTextMessage
      jms_message.text = data.to_str
    when :map
      jms_message      = self.createMapMessage
      jms_message.data = data
    when :bytes
      jms_message = self.createBytesMessage
      jms_message.write_bytes(data.to_java_bytes)
    else
      raise "Invalid type #{type} requested"
    end
    jms_message
  end

  # Create the destination based on the parameter supplied
  #
  # The idea behind this method is to allow the decision as to whether
  # one is sending to a topic or destination to be transparent to the code.
  # The supplied parameters can be externalized into say a YAML file
  # so that today it writes to a queue, later it can be changed to write
  # to a topic so that multiple parties can receive the same messages.
  #
  # Note: For Temporary Queues and Topics, remember to delete them when done
  #       or just use ::destination instead with a block and it will take care
  #       of deleting them for you
  #
  # To create a queue:
  #   session.create_destination(queue_name: 'name of queue')
  #
  # To create a temporary queue:
  #   session.create_destination(queue_name: :temporary)
  #
  # To create a queue:
  #   session.create_destination('queue://queue_name')
  #
  # To create a topic:
  #   session.create_destination(topic_name: 'name of queue')
  #
  # To create a temporary topic:
  #   session.create_destination(topic_name: :temporary)
  #
  # To create a topic:
  #   session.create_destination('topic://topic_name')
  #
  # Create the destination based on the parameter supplied
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   topic_name: [String] Name of the Topic to write to or subscribe to
  #               [Symbol] Create temporary topic
  #                  Mandatory unless :queue_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  # Returns the result of the supplied block
  def create_destination(params)
    # Allow a Java JMS destination object to be passed in
    return params[:destination] if params[:destination] && params[:destination].java_kind_of?(JMS::Destination)

    queue_name = nil
    topic_name = nil

    if params.is_a? String
      queue_name = params['queue://'.length..-1] if params.start_with?('queue://')
      topic_name = params['topic://'.length..-1] if params.start_with?('topic://')
    else
      # :q_name is deprecated
      queue_name = params[:queue_name] || params[:q_name]
      topic_name = params[:topic_name]
    end

    unless queue_name || topic_name
      raise(ArgumentError, 'Missing mandatory parameter :queue_name or :topic_name to Session::producer, Session::consumer, or Session::browser')
    end

    if queue_name
      queue_name == :temporary ? create_temporary_queue : create_queue(queue_name)
    else
      topic_name == :temporary ? create_temporary_topic : create_topic(topic_name)
    end
  end

  # Create a queue or topic to send or receive messages from
  #
  # A block must be supplied so that if it is a temporary topic or queue
  # it will be deleted after the block is complete
  #
  # To create a queue:
  #   session.destination(queue_name: 'name of queue')
  #
  # To create a temporary queue:
  #   session.destination(queue_name: :temporary)
  #
  # To create a topic:
  #   session.destination(topic_name: 'name of queue')
  #
  # To create a temporary topic:
  #   session.destination(topic_name: :temporary)
  #
  # Create the destination based on the parameter supplied
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   topic_name: [String] Name of the Topic to write to or subscribe to
  #               [Symbol] Create temporary topic
  #                  Mandatory unless :queue_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  #
  # Returns the result of the supplied block
  def destination(params={}, &block)
    raise(ArgumentError, 'Missing mandatory Block when calling JMS::Session#destination') unless block
    dest = nil
    begin
      dest = create_destination(params)
      block.call(dest)
    ensure
      # Delete Temporary Queue / Topic
      dest.delete if dest && dest.respond_to?(:delete)
    end
  end

  # Return the queue matching the queue name supplied
  # Call the Proc if supplied
  def queue(queue_name, &block)
    q = create_queue(queue_name)
    block.call(q) if block
    q
  end

  # Return a temporary queue
  # The temporary queue is deleted once the block completes
  # If no block is supplied then it should be deleted by the caller
  # when no longer needed
  def temporary_queue(&block)
    q = create_temporary_queue
    if block
      begin
        block.call(q)
      ensure
        # Delete Temporary queue on completion of block
        q.delete if q
        q = nil
      end
    end
    q
  end

  # Return the topic matching the topic name supplied
  # Call the Proc if supplied
  def topic(topic_name, &block)
    t = create_topic(topic_name)
    block.call(t) if block
    t
  end

  # Return a temporary topic
  # The temporary topic is deleted once the block completes
  # If no block is supplied then it should be deleted by the caller
  # when no longer needed
  def temporary_topic(&block)
    t = create_temporary_topic
    if block
      begin
        block.call(t)
      ensure
        # Delete Temporary topic on completion of block
        t.delete if t
        t = nil
      end
    end
    t
  end

  # Return a producer for the queue name supplied
  # A producer supports sending messages to a Queue or a Topic
  #
  # Call the Proc if supplied, then automatically close the producer
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   topic_name: [String] Name of the Topic to write to or subscribe to
  #               [Symbol] Create temporary topic
  #                  Mandatory unless :queue_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  def producer(params, &block)
    p = self.create_producer(self.create_destination(params))
    if block
      begin
        block.call(p)
      ensure
        p.close
        p = nil
      end
    end
    p
  end

  # Return a consumer for the destination
  # A consumer can read messages from the queue or topic
  #
  # Call the block if supplied, then automatically close the consumer
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   topic_name: [String] Name of the Topic to write to or subscribe to
  #               [Symbol] Create temporary topic
  #                  Mandatory unless :queue_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  #
  #   selector:   Filter which messages should be returned from the queue
  #                  Default: All messages
  #   no_local:   Determine whether messages published by its own connection
  #                  should be delivered to it
  #                  Default: false
  def consumer(params, &block)
    destination = create_destination(params)
    c           =
      if params[:no_local]
        create_consumer(destination, params[:selector] || '', params[:no_local])
      elsif params[:selector]
        create_consumer(destination, params[:selector])
      else
        create_consumer(destination)
      end

    if block
      begin
        block.call(c)
      ensure
        c.close
        c = nil
      end
    end
    c
  end

  # Consume all messages for the destination
  # A consumer can read messages from the queue or topic
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   topic_name: [String] Name of the Topic to write to or subscribe to
  #               [Symbol] Create temporary topic
  #                  Mandatory unless :queue_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  #
  #   selector:   Filter which messages should be returned from the queue
  #                  Default: All messages
  #   no_local:   Determine whether messages published by its own connection
  #                  should be delivered to it
  #                  Default: false
  #
  #   :timeout Follows the rules for MQSeries:
  #     -1 : Wait forever
  #      0 : Return immediately if no message is available
  #      x : Wait for x milli-seconds for a message to be received from the broker
  #           Note: Messages may still be on the queue, but the broker has not supplied any messages
  #                     in the time interval specified
  #      Default: 0
  #
  def consume(params, &block)
    begin
      c = self.consumer(params)
      c.each(params, &block)
    ensure
      c.close if c
    end
  end

  # Return a browser for the destination
  # A browser can read messages non-destructively from the queue
  # It cannot browse Topics!
  #
  # Call the Proc if supplied, then automatically close the consumer
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  #
  #   selector:   Filter which messages should be returned from the queue
  #                  Default: All messages
  def browser(params, &block)
    raise(ArgumentError, 'Session::browser requires a code block to be executed') unless block

    destination = create_destination(params)
    b           = nil
    if params[:selector]
      b = create_browser(destination, params[:selector])
    else
      b = create_browser(destination)
    end

    if block
      begin
        block.call(b)
      ensure
        b.close
        b = nil
      end
    end
    b
  end

  # Browse the specified queue, calling the Proc supplied for each message found
  #
  # Parameters:
  #   queue_name: [String] Name of the Queue to return
  #               [Symbol] Create temporary queue
  #                  Mandatory unless :topic_name is supplied
  #     Or,
  #   destination: [javaxJms::Destination] Destination to use
  #
  #   selector:    Filter which messages should be returned from the queue
  #                  Default: All messages
  def browse(params={}, &block)
    self.browser(params) { |b| b.each(params, &block) }
  end
end
