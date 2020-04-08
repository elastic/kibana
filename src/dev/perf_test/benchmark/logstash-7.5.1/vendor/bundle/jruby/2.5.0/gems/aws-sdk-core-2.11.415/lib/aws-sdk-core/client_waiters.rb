module Aws
  module ClientWaiters

    # @api private
    def self.included(subclass)
      class << subclass

        def set_waiters(waiters)
          @waiters =
            case waiters
            when Waiters::Provider then waiters
            when Hash then Waiters::Provider.new(waiters)
            when String, Pathname then Waiters::Provider.new(Json.load_file(waiters))
            when nil then Waiters::NullProvider.new
            else raise ArgumentError, 'invalid waiters'
            end
        end

        def waiters
          @waiters
        end

      end
    end

    # Waiters polls an API operation until a resource enters a desired
    # state.
    #
    # ## Basic Usage
    #
    # Waiters will poll until they are succesful, they fail by
    # entering a terminal state, or until a maximum number of attempts
    # are made.
    #
    #    # polls in a loop, sleeping between attempts
    #    client.waiter_until(waiter_name, params)
    #
    # ## Configuration
    #
    # You can configure the maximum number of polling attempts, and the
    # delay (in seconds) between each polling attempt. You configure
    # waiters by passing a block to {#wait_until}:
    #
    #     # poll for ~25 seconds
    #     client.wait_until(...) do |w|
    #       w.max_attempts = 5
    #       w.delay = 5
    #     end
    #
    # ## Callbacks
    #
    # You can be notified before each polling attempt and before each
    # delay. If you throw `:success` or `:failure` from these callbacks,
    # it will terminate the waiter.
    #
    #     started_at = Time.now
    #     client.wait_until(...) do |w|
    #
    #       # disable max attempts
    #       w.max_attempts = nil
    #
    #       # poll for 1 hour, instead of a number of attempts
    #       w.before_wait do |attempts, response|
    #         throw :failure if Time.now - started_at > 3600
    #       end
    #
    #     end
    #
    # ## Handling Errors
    #
    # When a waiter is successful, it returns `true`. When a waiter
    # fails, it raises an error. **All errors raised extend from
    # {Aws::Waiters::Errors::WaiterFailed}**.
    #
    #     begin
    #       client.wait_until(...)
    #     rescue Aws::Waiters::Errors::WaiterFailed
    #       # resource did not enter the desired state in time
    #     end
    #
    # @param [Symbol] waiter_name The name of the waiter. See {#waiter_names}
    #   for a full list of supported waiters.
    #
    # @param [Hash] params Additional request parameters. See the {#waiter_names}
    #   for a list of supported waiters and what request they call. The
    #   called request determines the list of accepted parameters.
    #
    # @yieldparam [Waiters::Waiter] waiter Yields a {Waiters::Waiter Waiter}
    #   object that can be configured prior to waiting.
    #
    # @raise [Errors::FailureStateError] Raised when the waiter terminates
    #   because the waiter has entered a state that it will not transition
    #   out of, preventing success.
    #
    # @raise [Errors::TooManyAttemptsError] Raised when the configured
    #   maximum number of attempts have been made, and the waiter is not
    #   yet successful.
    #
    # @raise [Errors::UnexpectedError] Raised when an error is encounted
    #   while polling for a resource that is not expected.
    #
    # @raise [Errors::NoSuchWaiterError] Raised when you request to wait
    #   for an unknown state.
    #
    # @return [Boolean] Returns `true` if the waiter was successful.
    #
    def wait_until(waiter_name, params = {}, &block)
      waiter = self.class.waiters.waiter(waiter_name)
      yield(waiter) if block_given?
      waiter.wait(client:self, params:params)
    end

    # Returns the list of supported waiters.
    # @return [Array<Symbol>]
    def waiter_names
      self.class.waiters.waiter_names
    end

  end
end
