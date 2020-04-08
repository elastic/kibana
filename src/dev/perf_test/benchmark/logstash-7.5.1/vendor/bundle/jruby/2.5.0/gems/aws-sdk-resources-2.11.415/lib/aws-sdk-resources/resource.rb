module Aws
  module Resources
    class Resource

      extend OperationMethods

      # @overload initialize(*identifiers, options = {})
      #   @param [Hash] options Options except `:data` and identifier options are
      #     used to construct a {Client} unless `:client` is given.
      #   @option options [Client] :client
      def initialize(*args)
        options = args.last.is_a?(Hash) ? args.pop.dup : {}
        @identifiers = extract_identifiers(args, options)
        @data = options.delete(:data)
        @client = extract_client(options)
      end

      # Marked private to prevent double documentation
      # @return [Client]
      attr_reader :client

      # Marked private to prevent double documentation
      # @return [Hash<Symbol,String>]
      attr_reader :identifiers

      # Waiter polls an API operation until a resource enters a desired
      # state.
      #
      # @note The waiting operation is performed on a copy. The original resource remains unchanged
      #
      # ## Basic Usage
      #
      # Waiter will polls until it is successful, it fails by
      # entering a terminal state, or until a maximum number of attempts
      # are made.
      #
      #     # polls in a loop until condition is true
      #     resource.wait_until(options) {|resource| condition}
      #
      # ## Example
      #
      #     instance.wait_until(max_attempts:10, delay:5) {|instance| instance.state.name == 'running' }
      #
      # ## Configuration
      #
      # You can configure the maximum number of polling attempts, and the
      # delay (in seconds) between each polling attempt. The waiting condition is set
      # by passing a block to {#wait_until}:
      #
      #     # poll for ~25 seconds
      #     resource.wait_until(max_attempts:5,delay:5) {|resource|...}
      #
      # ## Callbacks
      #
      # You can be notified before each polling attempt and before each
      # delay. If you throw `:success` or `:failure` from these callbacks,
      # it will terminate the waiter.
      #
      #     started_at = Time.now
      #     # poll for 1 hour, instead of a number of attempts
      #     proc = Proc.new do |attempts, response|
      #       throw :failure if Time.now - started_at > 3600
      #     end
      #
      #       # disable max attempts
      #     instance.wait_until(before_wait:proc, max_attempts:nil) {...}
      #
      # ## Handling Errors
      #
      # When a waiter is successful, it returns the Resource. When a waiter
      # fails, it raises an error.
      #
      #     begin
      #       resource.wait_until(...)
      #     rescue Aws::Waiters::Errors::WaiterFailed
      #       # resource did not enter the desired state in time
      #     end
      #
      #
      # @yieldparam [Resource] resource to be used in the waiting condition
      #
      # @raise [Aws::Waiters::Errors::FailureStateError] Raised when the waiter terminates
      #   because the waiter has entered a state that it will not transition
      #   out of, preventing success.
      #
      # @raise [Aws::Waiters::Errors::TooManyAttemptsError] Raised when the configured
      #   maximum number of attempts have been made, and the waiter is not
      #   yet successful.
      #
      # @raise [Aws::Waiters::Errors::UnexpectedError] Raised when an error is encountered
      #   while polling for a resource that is not expected.
      #
      # @raise [NotImplementedError] Raised when the resource does not
      #   support #reload operation
      #
      # @option options [Integer] :max_attempts (10) Maximum number of attempts
      # @option options [Integer] :delay (10) Delay between each attempt in seconds
      # @option options [Proc] :before_attempt (nil) Callback invoked before each attempt
      # @option options [Proc] :before_wait (nil) Callback invoked before each wait
      # @return [Resource] if the waiter was successful
      def wait_until(options = {}, &block)
        resource_copy = self.dup
        attempts = 0
        options[:max_attempts] = 10 unless options.key?(:max_attempts)
        options[:delay] ||= 10
        options[:poller] = Proc.new do
          attempts += 1
          if block.call(resource_copy)
            [:success, resource_copy]
          else
            resource_copy.reload unless attempts == options[:max_attempts]
            :retry
          end
        end
        Waiters::Waiter.new(options).wait({})
      end

      # @return [Struct]
      def data
        load unless @data
        @data
      end

      # @return [Boolean] Returns `true` if {#data} has been loaded.
      def data_loaded?
        !@data.nil?
      end

      # @api private
      def exists?(options = {})
        wait_until_exists(options) { |w| w.max_attempts = 1 }
        true
      rescue Waiters::Errors::UnexpectedError => e
        raise e.error
      rescue Waiters::Errors::WaiterFailed
        false
      rescue NoMethodError
        msg = "#exists? is not implemented for #{self.class.name}"
        raise NotImplementedError, msg
      end

      # Loads data for this resource.
      # @note Calling this method will send a request to AWS.
      # @return [self]
      def load
        if load_operation = self.class.load_operation
          @data = load_operation.call(resource:self, client:client)
          self
        else
          raise NotImplementedError, "#load not defined for #{self.class.name}"
        end
      end
      alias reload load

      # @api private
      def inspect
        identifiers = self.identifiers.map do |name, value|
          "#{name}=#{value.inspect}"
        end.join(', ')
        "#<#{[self.class.name, identifiers].join(' ').strip}>"
      end

      private

      def extract_client(options)
        if options[:client]
          options[:client]
        else
          self.class.client_class.new(options.merge(
            user_agent_suffix: "resources"
          ))
        end
      end

      def extract_identifiers(args, options)
        identifiers = {}
        self.class.identifiers.each.with_index do |name, n|
          if args[n]
            identifiers[name] = args[n]
          elsif options[name]
            identifiers[name] = options.delete(name)
          else
            raise ArgumentError, "missing required option #{name.inspect}"
          end
        end
        identifiers
      end

      class << self

        # @return [String, nil] The resource name.
        attr_accessor :resource_name

        # @return [Class<Client>, nil] When constructing
        #   a resource, the client will default to an instance of the
        #   this class.
        attr_accessor :client_class

        # @return [Operations::LoadOperation, nil]
        attr_accessor :load_operation

        # @return [Array<Symbol>]
        # @see add_identifier
        # @see #identifiers
        def identifiers
          @identifiers.dup
        end

        # @param [Symbol] name
        # @return [void]
        def add_identifier(name)
          name = name.to_sym
          safe_define_method(name) { @identifiers[name] }
          @identifiers << name
        end

        # Registers a data attribute.  This defines a simple getter
        # for the attribute which will access {#data}, loading the
        # resource if necessary.
        # @param [Symbol] name
        # @return [void]
        def add_data_attribute(name)
          safe_define_method(name) { data[name] }
          @data_attributes << name
        end

        # @return [Array<Symbol>] Returns an array of symbolized data
        #   attribute names.
        def data_attributes
          @data_attributes.dup
        end

        # @api private
        def inherited(subclass)
          subclass.send(:instance_variable_set, "@identifiers", [])
          subclass.send(:instance_variable_set, "@data_attributes", [])
          super
        end

      end
    end
  end
end
