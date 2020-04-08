module Aws
  module Waiters
    # @api private
    class Provider

      def initialize(definitions)
        @waiters = {}
        definitions['waiters'].each do |waiter_name, definition|
          @waiters[Seahorse::Util.underscore(waiter_name).to_sym] = {
            poller: Poller.new(definition),
            max_attempts: definition['maxAttempts'],
            delay: definition['delay'],
          }
        end
      end

      # @return [Array<Symbol>]
      def waiter_names
        @waiters.keys
      end

      # @param [Symbol] waiter_name
      # @return [Waiter]
      # @raise [ArgumentError]
      def waiter(waiter_name)
        if @waiters.key?(waiter_name)
          Waiter.new(@waiters[waiter_name])
        else
          raise Errors::NoSuchWaiterError.new(waiter_name, waiter_names)
        end
      end

    end
  end
end
