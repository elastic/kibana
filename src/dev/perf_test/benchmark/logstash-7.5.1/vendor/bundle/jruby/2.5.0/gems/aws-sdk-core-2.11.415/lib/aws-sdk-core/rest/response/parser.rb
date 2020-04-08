module Aws
  module Rest
    module Response
      class Parser

        def apply(response)
          # TODO : remove this unless check once response stubbing is fixed
          unless response.data
            response.data = response.context.operation.output[:struct_class].new
          end
          extract_status_code(response)
          extract_headers(response)
          extract_body(response)
        end

        private

        def extract_status_code(response)
          status_code = StatusCode.new(response.context.operation.output)
          status_code.apply(response.context.http_response, response.data)
        end

        def extract_headers(response)
          headers = Headers.new(response.context.operation.output)
          headers.apply(response.context.http_response, response.data)
        end

        def extract_body(response)
          Body.new(
            parser_class(response),
            response.context.operation.output,
          ).apply(response.context.http_response.body, response.data)
        end

        def parser_class(response)
          protocol = response.context.config.api.metadata['protocol']
          case protocol
          when 'rest-xml' then Xml::Parser
          when 'rest-json' then Json::Parser
          else raise "unsupported protocol #{protocol}"
          end
        end

      end
    end
  end
end
