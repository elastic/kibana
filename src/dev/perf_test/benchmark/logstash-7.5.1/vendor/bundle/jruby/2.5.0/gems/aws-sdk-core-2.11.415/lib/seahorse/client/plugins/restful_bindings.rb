module Seahorse
  module Client
    module Plugins
      # @api private
      class RestfulBindings < Plugin

        # @api private
        class Handler < Client::Handler

          include Seahorse::Model::Shapes

          def call(context)
            build_request(context)
            @handler.call(context).on(200..299) do |response|
              parse_response(response)
            end
          end

          private

          # Populates the HTTP request method and headers.
          def build_request(context)
            populate_http_request_method(context)
            populate_http_headers(context)
          end

          def populate_http_request_method(context)
            context.http_request.http_method = context.operation.http_method
          end

          def populate_http_headers(context)
            params = context.params
            headers = context.http_request.headers
            each_member(context.operation.input) do |member_name, member_ref|
              value = params[member_name]
              next if value.nil?
              case member_ref.location
              when 'header'  then serialize_header(headers, member_ref, value)
              when 'headers' then serialize_header_map(headers, member_ref, value)
              end
            end
          end

          def serialize_header(headers, ref, value)
            headers[ref.location_name] = serialize_header_value(ref, value)
          end

          def serialize_header_map(headers, ref, values)
            prefix = ref.location_name || ''
            values.each_pair do |name, value|
              value = serialize_header_value(ref.shape.value, value)
              headers["#{prefix}#{name}"] = value
            end
          end

          def serialize_header_value(ref, value)
            if TimestampShape === ref.shape
              value.utc.httpdate
            else
              value.to_s
            end
          end

          # Extracts HTTP response headers and status code.
          def parse_response(response)
            headers = response.context.http_response.headers
            each_member(response.context.operation.output) do |key, ref|
              case ref.location
              when 'statusCode'
                status_code = response.context.http_response.status_code
                response.data[key] = status_code
              when 'header'
                if headers.key?(ref.location_name)
                  response.data[key] = extract_header(headers, ref)
                end
              when 'headers'
                response.data[key] = extract_header_map(headers, ref)
              end
            end
          end

          def extract_header(headers, ref)
            parse_header_value(ref, headers[ref.location_name])
          end

          def extract_header_map(headers, ref)
            prefix = ref.location_name || ''
            hash = {}
            headers.each do |header, value|
              if match = header.match(/^#{prefix}(.+)/i)
                hash[match[1]] = parse_header_value(ref.shape.value, value)
              end
            end
            hash
          end

          def parse_header_value(ref, value)
            if value
              case ref.shape
              when IntegerShape then value.to_i
              when FloatShape then value.to_f
              when BooleanShape then value == 'true'
              when TimestampShape
                if value =~ /\d+(\.\d*)/
                  Time.at(value.to_f)
                else
                  Time.parse(value)
                end
              else value
              end
            end
          end

          def each_member(ref, &block)
            ref.shape.members.each(&block) if ref
          end

        end

        handle(Handler, priority: 90)

      end
    end
  end
end
