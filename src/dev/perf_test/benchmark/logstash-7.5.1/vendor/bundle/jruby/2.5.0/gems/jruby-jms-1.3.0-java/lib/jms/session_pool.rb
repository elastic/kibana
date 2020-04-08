require 'gene_pool'

module JMS
  # Since a Session can only be used by one thread at a time, we could create
  # a Session for every thread. That could result in excessive unused Sessions.
  # An alternative is to create a pool of sessions that can be shared by
  # multiple threads.
  #
  # Each thread can request a session and then return it once it is no longer
  # needed by that thread. The only way to get a session is pass a block so that
  # the Session is automatically returned to the pool upon completion of the block.
  #
  # Parameters:
  #   see regular session parameters from: JMS::Connection#initialize
  #
  # Additional parameters for controlling the session pool itself
  #   :pool_size         Maximum Pool Size. Default: 10
  #                      The pool only grows as needed and will never exceed
  #                      :pool_size
  #   :pool_timeout      Number of seconds to wait before raising a TimeoutError
  #                      if no sessions are available in the poo
  #                      Default: 60
  #   :pool_warn_timeout Number of seconds to wait before logging a warning when a
  #                      session in the pool is not available
  #                      Default: 5
  #   :pool_name         Name of the pool as it shows up in the logger.
  #                      Default: 'JMS::SessionPool'
  # Example:
  #   session_pool = connection.create_session_pool(config)
  #   session_pool.session do |session|
  #      ....
  #   end
  class SessionPool
    def initialize(connection, params={})
      # Save Session params since it will be used every time a new session is
      # created in the pool
      session_params = params.nil? ? {} : params.dup
      logger         = SemanticLogger[session_params[:pool_name] || self.class]

      # Use GenePool can create and manage the pool of sessions
      @pool          = GenePool.new(
        name:         '',
        pool_size:    session_params[:pool_size] || 10,
        warn_timeout: session_params[:pool_warn_timeout] || 5,
        timeout:      session_params[:pool_timeout] || 60,
        close_proc:   nil,
        logger:       logger
      ) do
        session                      = connection.create_session(session_params)
        # Turn on Java class persistence: https://github.com/jruby/jruby/wiki/Persistence
        session.class.__persistent__ = true
        session
      end

      # Handle connection failures
      connection.on_exception do |jms_exception|
        logger.error "JMS Connection Exception has occurred: #{jms_exception.inspect}"
      end
    end

    # Obtain a session from the pool and pass it to the supplied block
    # The session is automatically returned to the pool once the block completes
    #
    # In the event a JMS Exception is thrown the session will be closed and removed
    # from the pool to prevent re-using sessions that are no longer valid
    def session(&block)
      s = nil
      begin
        s = @pool.checkout
        block.call(s)
      rescue javax.jms.JMSException => e
        s.close rescue nil
        @pool.remove(s)
        s = nil # Do not check back in since we have removed it
        raise e
      ensure
        @pool.checkin(s) if s
      end
    end

    # Obtain a session from the pool and create a MessageConsumer.
    # Pass both into the supplied block.
    # Once the block is complete the consumer is closed and the session is
    # returned to the pool.
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
    # Example
    #   session_pool.consumer(queue_name: 'MyQueue') do |session, consumer|
    #     message = consumer.receive(timeout)
    #     puts message.data if message
    #   end
    def consumer(params, &block)
      session do |s|
        begin
          consumer = s.consumer(params)
          block.call(s, consumer)
        ensure
          consumer.close if consumer
        end
      end
    end

    # Obtain a session from the pool and create a MessageProducer.
    # Pass both into the supplied block.
    # Once the block is complete the producer is closed and the session is
    # returned to the pool.
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
    # Example
    #   session_pool.producer(queue_name: 'ExampleQueue') do |session, producer|
    #     producer.send(session.message("Hello World"))
    #   end
    def producer(params, &block)
      session do |s|
        begin
          producer = s.producer(params)
          block.call(s, producer)
        ensure
          producer.close if producer
        end
      end
    end

    # Immediately Close all sessions in the pool and release from the pool
    #
    # Note: This is an immediate close, active sessions will be aborted
    #
    # Note: Once closed a session pool cannot be re-used. A new instance must
    #       be created
    def close
      @pool.each { |s| s.close }
    end

  end
end
