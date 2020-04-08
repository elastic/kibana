module Aws
  module Waiters
    # @api private
    class NullProvider < Provider

      def initialize
        super('waiters' => {})
      end

    end
  end
end
