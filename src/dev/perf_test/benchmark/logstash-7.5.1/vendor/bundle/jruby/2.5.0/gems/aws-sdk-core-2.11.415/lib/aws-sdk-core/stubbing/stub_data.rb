module Aws
  module Stubbing
    class StubData

      def initialize(operation)
        @rules = operation.output
        @pager = operation[:pager]
      end

      def stub(data = {})
        stub = EmptyStub.new(@rules).stub
        remove_paging_tokens(stub)
        apply_data(data, stub)
        stub
      end

      private

      def remove_paging_tokens(stub)
        if @pager
          @pager.instance_variable_get("@tokens").keys.each do |path|
            key = path.split(/\b/)[0]
            stub[key] = nil
          end
        end
      end

      def apply_data(data, stub)
        ParamValidator.new(@rules, validate_required:false).validate!(data)
        DataApplicator.new(@rules).apply_data(data, stub)
      end
    end
  end
end
