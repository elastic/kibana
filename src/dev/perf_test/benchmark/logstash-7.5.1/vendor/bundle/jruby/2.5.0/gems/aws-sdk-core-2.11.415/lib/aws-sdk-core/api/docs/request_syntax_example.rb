module Aws
  module Api
    module Docs
      class RequestSyntaxExample

        include Utils
        include Seahorse::Model::Shapes

        def initialize(method_name, operation)
          @method_name = method_name
          @operation = operation
        end

        def to_str
          params = ParamFormatter.new(operation_input_ref(@operation))
          "resp = client.#{@method_name}(#{params.format})"
        end

      end
    end
  end
end
