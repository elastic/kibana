module Aws
  module Resources
    class Documenter
      class DataOperationDocumenter < BaseOperationDocumenter

        def return_type
          if plural?
            "Array<#{path_type}>"
          else
            path_type
          end
        end

        def return_tag
          tag("@return [#{return_type}]")
        end

        def plural?
          !!@operation.path.match(/\[/)
        end

      end
    end
  end
end
