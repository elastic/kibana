module Aws
  module Resources
    module Options

      private

      def option(key, options)
        if options[key].nil?
          raise Errors::DefinitionError, "missing required option #{key.inspect}"
        else
          options[key]
        end
      end

    end
  end
end
