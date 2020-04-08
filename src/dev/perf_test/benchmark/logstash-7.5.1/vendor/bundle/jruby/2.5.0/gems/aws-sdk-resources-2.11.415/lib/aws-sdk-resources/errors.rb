module Aws
  module Resources
    module Errors

      class UnknownOperationError < ArgumentError
        def initialize(name)
          super("operation `#{name}' not defined")
        end
      end

      class DefinitionError < ArgumentError; end

    end
  end
end
