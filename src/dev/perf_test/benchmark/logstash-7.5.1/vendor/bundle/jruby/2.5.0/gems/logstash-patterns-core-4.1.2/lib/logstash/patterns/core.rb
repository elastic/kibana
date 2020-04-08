module LogStash
  module Patterns
    module Core
    extend self

      def path
        ::File.expand_path('../../../patterns', ::File.dirname(__FILE__))
      end

    end
  end
end
