module Aws
  module Resources
    class Documenter
      class OperationDocumenter < BaseOperationDocumenter

        def docstring
          @api_request.documentation
        end

        def return_tag
          @yard_client_operation.tags.each do |tag|
            return tag if tag.tag_name == 'return'
          end
          nil
        end

      end
    end
  end
end
