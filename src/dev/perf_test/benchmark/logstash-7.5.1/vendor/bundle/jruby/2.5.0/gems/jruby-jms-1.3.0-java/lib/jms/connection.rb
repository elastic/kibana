require 'semantic_logger'
# Module: Java Messaging System (JMS) Interface
module JMS
  # Every JMS session must have at least one Connection instance
  # A Connection instance represents a connection between this client application
  # and the JMS Provider (server/queue manager/broker).
  # A connection is distinct from a Session, in that multiple Sessions can share a
  # single connection. Also, unit of work control (commit/rollback) is performed
  # at the Session level.
  #
  # Since many JRuby applications will only have one connection and one session
  # several convenience methods have been added to support creating both the
  # Session and Connection objects automatically.
  #
  # For Example, to read all messages from a queue and then terminate:
  #  require 'rubygems'
  #  require 'jms'
  #
  #  JMS::Connection.create_session(
  #    factory:      'org.apache.activemq.ActiveMQConnectionFactory',
  #    broker_url:   'tcp://localhost:61616',
  #    require_jars: [
  #      '/usr/local/Cellar/activemq/5.11.1/libexec/activemq-all-5.11.1.jar',
  #      '/usr/local/Cellar/activemq/5.11.1/libexec/lib/optional/log4j-1.2.17.jar'
  #    ]
  #  ) do |session|
  #    session.consumer(:queue_name=>'TEST') do |consumer|
  #      if message = consumer.receive_no_wait
  #        puts "Data Received: #{message.data}"
  #      else
  #        puts 'No message available'
  #      end
  #    end
  #  end
  #
  # The above code creates a Connection and then a Session. Once the block completes
  # the session is closed and the Connection disconnected.
  #
  # See: http://download.oracle.com/javaee/6/api/javax/jms/Connection.html
  #
  class Connection
    include SemanticLogger::Loggable

    # Create a connection to the JMS provider, start the connection,
    # call the supplied code block, then close the connection upon completion
    #
    # Returns the result of the supplied block
    def self.start(params = {}, &block)
      raise(ArgumentError, 'Missing mandatory Block when calling JMS::Connection.start') unless block
      connection = Connection.new(params)
      connection.start
      begin
        block.call(connection)
      ensure
        connection.close
      end
    end

    # Connect to a JMS Broker, create and start the session,
    # then call the code block passing in the session.
    # Both the Session and Connection are closed on termination of the block
    #
    # Shortcut convenience method to both connect to the broker and create a session
    # Useful when only a single session is required in the current thread
    #
    # Note: It is important that each thread have its own session to support transactions
    #       This method will also start the session immediately so that any
    #       consumers using this session will start immediately
    def self.session(params = {}, &block)
      self.start(params) do |connection|
        connection.session(params, &block)
      end
    end

    # Load the required jar files for this JMS Provider and
    # load JRuby extensions for those classes
    #
    # Rather than copying the JMS jar files into the JRuby lib, load them
    # on demand. JRuby JMS extensions are only loaded once the jar files have been
    # loaded.
    #
    # Can be called multiple times if required, although it would not be performant
    # to do so regularly.
    #
    # Parameter: jar_list is an Array of the path and filenames to jar files
    #                     to load for this JMS Provider
    #
    # Returns nil
    def fetch_dependencies(jar_list)
      jar_list.each do |jar|
        logger.debug "Loading Jar File:#{jar}"
        begin
          require jar
        rescue Exception => exc
          logger.error "Failed to Load Jar File:#{jar}", exc
        end
      end if jar_list

      require 'jms/mq_workaround'
      require 'jms/imports'
      require 'jms/message_listener_impl'
      require 'jms/message'
      require 'jms/text_message'
      require 'jms/map_message'
      require 'jms/bytes_message'
      require 'jms/object_message'
      require 'jms/session'
      require 'jms/message_consumer'
      require 'jms/message_producer'
      require 'jms/queue_browser'
    end

    # Create a connection to the JMS provider
    #
    # Note: Connection::start must be called before any consumers will be
    #       able to receive messages
    #
    # In JMS we need to start by obtaining the JMS Factory class that is supplied
    # by the JMS Vendor.
    #
    # There are 3 ways to establish a connection to a JMS Provider
    #   1. Supply the name of the JMS Providers Factory Class
    #   2. Supply an instance of the JMS Provider class itself
    #   3. Use a JNDI lookup to return the JMS Provider Factory class
    # Parameters:
    #   factory:   [String] Name of JMS Provider Factory class
    #              [Class]  JMS Provider Factory class itself
    #
    #   jndi_name:    [String] Name of JNDI entry at which the Factory can be found
    #   jndi_context: Mandatory if jndi lookup is being used, contains details
    #                 on how to connect to JNDI server etc.
    #
    #   require_jars: [Array<String>] An optional array of Jar file names to load for the specified
    #                 JMS provider. By using this option it is not necessary
    #                 to put all the JMS Provider specific jar files into the
    #                 environment variable CLASSPATH prior to starting JRuby
    #
    #   username:  [String] Username to connect to JMS provider with
    #   password:  [String] Password to use when to connecting to the JMS provider
    #              Note: :password is ignored if :username is not supplied
    #
    # :factory and :jndi_name are mutually exclusive, both cannot be supplied at the
    # same time. :factory takes precedence over :jndi_name
    #
    # JMS Provider specific properties can be set if the JMS Factory itself
    # has setters for those properties.
    #
    # For some known examples, see: [Example jms.yml](https://github.com/reidmorrison/jruby-jms/blob/master/examples/jms.yml)
    def initialize(params = {})
      # Used by #on_message
      @sessions  = []
      @consumers = []

      options = params.dup

      # Load Jar files on demand so that they do not need to be in the CLASSPATH
      # of JRuby lib directory
      fetch_dependencies(options.delete(:require_jars))

      connection_factory = nil
      factory            = options.delete(:factory)
      if factory
        # If factory check if oracle is needed.
        require('jms/oracle_a_q_connection_factory') if factory.include?('AQjmsFactory')

        # If factory is a string, then it is the name of a class, not the class itself
        factory            = eval(factory) if factory.respond_to?(:to_str)
        connection_factory = factory.new
      elsif jndi_name = options[:jndi_name]
        raise(ArgumentError, 'Missing mandatory parameter :jndi_context in call to Connection::connect') unless jndi_context = options[:jndi_context]
        if jndi_context['java.naming.factory.initial'].include?('AQjmsInitialContextFactory')
          require 'jms/oracle_a_q_connection_factory'
        end

        jndi = javax.naming.InitialContext.new(java.util.Hashtable.new(jndi_context))
        begin
          connection_factory = jndi.lookup jndi_name
        ensure
          jndi.close
        end
      else
        raise(ArgumentError, 'Missing mandatory parameter :factory or :jndi_name missing in call to Connection::connect')
      end
      options.delete(:jndi_name)
      options.delete(:jndi_context)

      logger.debug "Using Factory: #{connection_factory.java_class}" if connection_factory.respond_to? :java_class
      options.each_pair do |key, val|
        next if [:username, :password].include?(key)

        method = key.to_s+'='
        if connection_factory.respond_to? method
          connection_factory.send method, val
          logger.debug "   #{key} = #{connection_factory.send key.to_sym}" if connection_factory.respond_to? key.to_sym
        else
          logger.warn "#{connection_factory.java_class} does not understand option: :#{key}=#{val}, ignoring :#{key}" if connection_factory.respond_to? :java_class
        end
      end

      # Check for username and password
      if options[:username]
        @jms_connection = connection_factory.create_connection(options[:username], options[:password])
      else
        @jms_connection = connection_factory.create_connection
      end
    end

    # Start (or restart) delivery of incoming messages over this connection.
    # By default no messages are delivered until this method is called explicitly
    # Delivery of messages to any asynchronous Destination::each() call will only
    # start after Connection::start is called, or Connection.start is used
    def start
      @jms_connection.start
    end

    # Temporarily stop delivery of incoming messages on this connection
    # Useful during a hot code update or other changes that need to be completed
    # without any new messages being processed
    # Call start() to resume receiving messages
    def stop
      @jms_connection.stop
    end

    # Create a session over this connection.
    # It is recommended to create separate sessions for each thread
    # If a block of code is passed in, it will be called and then the session is automatically
    # closed on completion of the code block
    #
    # Parameters:
    #  transacted: [true|false]
    #      Determines whether transactions are supported within this session.
    #      I.e. Whether commit or rollback can be called
    #      Default: false
    #      Note: :options below are ignored if this value is set to :true
    #
    #  options: any of the JMS::Session constants:
    #     Note: :options are ignored if transacted: true
    #     JMS::Session::AUTO_ACKNOWLEDGE
    #        With this acknowledgment mode, the session automatically acknowledges
    #        a client's receipt of a message either when the session has successfully
    #        returned from a call to receive or when the message listener the session has
    #        called to process the message successfully returns.
    #     JMS::Session::CLIENT_ACKNOWLEDGE
    #        With this acknowledgment mode, the client acknowledges a consumed
    #        message by calling the message's acknowledge method.
    #     JMS::Session::DUPS_OK_ACKNOWLEDGE
    #        This acknowledgment mode instructs the session to lazily acknowledge
    #        the delivery of messages.
    #     JMS::Session::SESSION_TRANSACTED
    #        This value is returned from the method getAcknowledgeMode if the
    #        session is transacted.
    #     Default: JMS::Session::AUTO_ACKNOWLEDGE
    #
    def session(params={}, &block)
      raise(ArgumentError, 'Missing mandatory Block when calling JMS::Connection#session') unless block
      session = self.create_session(params)
      begin
        block.call(session)
      ensure
        session.close
      end
    end

    # Create a session over this connection.
    # It is recommended to create separate sessions for each thread
    #
    # Note: Remember to call close on the returned session when it is no longer
    #       needed. Rather use JMS::Connection#session with a block whenever
    #       possible
    #
    # Parameters:
    #  transacted: true or false
    #      Determines whether transactions are supported within this session.
    #      I.e. Whether commit or rollback can be called
    #      Default: false
    #      Note: :options below are ignored if this value is set to :true
    #
    #  options: any of the JMS::Session constants:
    #     Note: :options are ignored if transacted: true
    #     JMS::Session::AUTO_ACKNOWLEDGE
    #        With this acknowledgment mode, the session automatically acknowledges
    #        a client's receipt of a message either when the session has successfully
    #        returned from a call to receive or when the message listener the session has
    #        called to process the message successfully returns.
    #     JMS::Session::CLIENT_ACKNOWLEDGE
    #        With this acknowledgment mode, the client acknowledges a consumed
    #        message by calling the message's acknowledge method.
    #     JMS::Session::DUPS_OK_ACKNOWLEDGE
    #        This acknowledgment mode instructs the session to lazily acknowledge
    #        the delivery of messages.
    #     JMS::Session::SESSION_TRANSACTED
    #        This value is returned from the method getAcknowledgeMode if the
    #        session is transacted.
    #     Default: JMS::Session::AUTO_ACKNOWLEDGE
    #
    def create_session(params={})
      transacted = params[:transacted] || false
      options    = params[:options] || JMS::Session::AUTO_ACKNOWLEDGE
      @jms_connection.create_session(transacted, options)
    end

    # Close connection with the JMS Provider
    # First close any consumers or sessions that are active as a result of JMS::Connection::on_message
    def close
      @consumers.each { |consumer| consumer.close } if @consumers
      @consumers = []

      @sessions.each { |session| session.close } if @sessions
      @session=[]

      @jms_connection.close if @jms_connection
    end

    # Gets the client identifier for this connection.
    def client_id
      @jms_connection.getClientID
    end

    # Sets the client identifier for this connection.
    def client_id=(client_id)
      @jms_connection.setClientID(client_id)
    end

    # Returns the ExceptionListener object for this connection
    # Returned class implements interface JMS::ExceptionListener
    def exception_listener
      @jms_connection.getExceptionListener
    end

    # Sets an exception listener for this connection
    # See ::on_exception to set a Ruby Listener
    # Returns: nil
    def exception_listener=(listener)
      @jms_connection.setExceptionListener(listener)
    end

    # Whenever an exception occurs the supplied block is called
    # This is important when Connection::on_message has been used, since
    # failures to the connection would be lost otherwise
    #
    # For details on the supplied parameter when the block is called,
    # see: http://download.oracle.com/javaee/6/api/javax/jms/JMSException.html
    #
    # Example:
    #   connection.on_exception do |jms_exception|
    #     puts "JMS Exception has occurred: #{jms_exception}"
    #   end
    #
    # Returns: nil
    def on_exception(&block)
      @jms_connection.setExceptionListener(block)
    end

    # Gets the metadata for this connection
    # see: http://download.oracle.com/javaee/6/api/javax/jms/ConnectionMetaData.html
    def meta_data
      @jms_connection.getMetaData
    end

    # Return a string describing the JMS provider and version
    def to_s
      md = @jms_connection.getMetaData
      "JMS::Connection provider: #{md.getJMSProviderName} v#{md.getProviderVersion}, JMS v#{md.getJMSVersion}"
    end

    # Receive messages in a separate thread when they arrive
    #
    # Allows messages to be received Asynchronously in a separate thread.
    # This method will return to the caller before messages are processed.
    # It is then the callers responsibility to keep the program active so that messages
    # can then be processed.
    #
    # Session Parameters:
    #  transacted: true or false
    #      Determines whether transactions are supported within this session.
    #      I.e. Whether commit or rollback can be called
    #      Default: false
    #      Note: :options below are ignored if this value is set to :true
    #
    #  options: any of the JMS::Session constants:
    #     Note: :options are ignored if transacted: true
    #     JMS::Session::AUTO_ACKNOWLEDGE
    #        With this acknowledgment mode, the session automatically acknowledges
    #        a client's receipt of a message either when the session has successfully
    #        returned from a call to receive or when the message listener the session has
    #        called to process the message successfully returns.
    #     JMS::Session::CLIENT_ACKNOWLEDGE
    #        With this acknowledgment mode, the client acknowledges a consumed
    #        message by calling the message's acknowledge method.
    #     JMS::Session::DUPS_OK_ACKNOWLEDGE
    #        This acknowledgment mode instructs the session to lazily acknowledge
    #        the delivery of messages.
    #     JMS::Session::SESSION_TRANSACTED
    #        This value is returned from the method getAcknowledgeMode if the
    #        session is transacted.
    #     Default: JMS::Session::AUTO_ACKNOWLEDGE
    #
    #   :session_count : Number of sessions to create, each with their own consumer which
    #                    in turn will call the supplied code block.
    #                    Note: The supplied block must be thread safe since it will be called
    #                          by several threads at the same time.
    #                          I.e. Don't change instance variables etc. without the
    #                          necessary semaphores etc.
    #                    Default: 1
    #
    # Consumer Parameters:
    #   queue_name: String: Name of the Queue to return
    #                  Symbol: temporary: Create temporary queue
    #                  Mandatory unless :topic_name is supplied
    #     Or,
    #   topic_name: String: Name of the Topic to write to or subscribe to
    #                  Symbol: temporary: Create temporary topic
    #                  Mandatory unless :queue_name is supplied
    #     Or,
    #   destination:Explicit javaxJms::Destination to use
    #
    #   selector:   Filter which messages should be returned from the queue
    #                  Default: All messages
    #
    #   no_local:   Determine whether messages published by its own connection
    #                  should be delivered to the supplied block
    #                  Default: false
    #
    #   :statistics Capture statistics on how many messages have been read
    #      true  : This method will capture statistics on the number of messages received
    #              and the time it took to process them.
    #              The timer starts when each() is called and finishes when either the last message was received,
    #              or when Destination::statistics is called. In this case MessageConsumer::statistics
    #              can be called several times during processing without affecting the end time.
    #              Also, the start time and message count is not reset until MessageConsumer::each
    #              is called again with statistics: true
    #
    # Usage: For transacted sessions the block supplied must return either true or false:
    #          true => The session is committed
    #          false => The session is rolled back
    #          Any Exception => The session is rolled back
    #
    # Note: Separately invoke Connection#on_exception so that connection failures can be handled
    #       since on_message will Not be called if the connection is lost
    #
    def on_message(params, &block)
      raise 'JMS::Connection must be connected prior to calling JMS::Connection::on_message' unless @sessions && @consumers

      consumer_count = params[:session_count] || 1
      consumer_count.times do
        session  = self.create_session(params)
        consumer = session.consumer(params)
        if session.transacted?
          consumer.on_message(params) do |message|
            begin
              block.call(message) ? session.commit : session.rollback
            rescue => exc
              session.rollback
              throw exc
            end
          end
        else
          consumer.on_message(params, &block)
        end
        @consumers << consumer
        @sessions << session
      end
    end

    # Return the statistics for every active Connection#on_message consumer
    # in an Array
    #
    # For details on the contents of each element in the array, see: Consumer#on_message_statistics
    def on_message_statistics
      @consumers.collect { |consumer| consumer.on_message_statistics }
    end

    # Since a Session can only be used by one thread at a time, we could create
    # a Session for every thread. That could result in excessive unused Sessions.
    # An alternative is to create a pool of sessions that can be shared by
    # multiple threads.
    #
    # Each thread can request a session and then return it once it is no longer
    # needed by that thread. The only way to get a session is to pass a block so that
    # the Session is automatically returned to the pool upon completion of the block.
    #
    # Parameters:
    #   see regular session parameters from: JMS::Connection#initialize
    #
    # Additional parameters for controlling the session pool itself
    #   :pool_size         Maximum Pool Size. Default: 10
    #                      The pool only grows as needed and will never exceed
    #                      :pool_size
    #   :pool_warn_timeout Number of seconds to wait before logging a warning when a
    #                      session in the pool is not available. Measured in seconds
    #                      Default: 5.0
    #   :pool_name         Name of the pool as it shows up in the logger.
    #                      Default: 'JMS::SessionPool'
    # Example:
    #   session_pool = connection.create_session_pool(config)
    #
    #   session_pool.session do |session|
    #      producer.send(session.message("Hello World"))
    #   end
    def create_session_pool(params={})
      JMS::SessionPool.new(self, params)
    end

  end

end
