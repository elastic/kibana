module Aws
  module Plugins

    # @seahorse.client.option [Boolean] :compute_checksums (true)
    #   When `true`, a CRC32 checksum is computed of every HTTP
    #   response body and compared against the `X-Amz-Crc32` header.
    #   If the checksums do not match, the request is re-sent.
    #   Failures can be retried up to `:retry_limit` times.
    class DynamoDBCRC32Validation < Seahorse::Client::Plugin

      option(:compute_checksums, true)

      def add_handlers(handlers, config)
        if config.compute_checksums
          handlers.add(Handler, step: :sign)
        end
      end

      class Handler < Seahorse::Client::Handler

        def call(context)
          # disable response gzipping - Net::HTTP unzips these responses
          # before we can see the body, making it impossible to verify
          # the CRC32 checksum against the compressed body stream
          context.http_request.headers['accept-encoding'] = ''

          @handler.call(context).on_success do |response|
            response.error = validate(context)
          end
        end

        private

        def validate(context)
          unless crc32_is_valid?(context.http_response)
            msg = "Response failed CRC32 check."
            return Aws::DynamoDB::Errors::CRC32CheckFailed.new(context, msg)
          end
        end

        def crc32_is_valid?(response)
          if crc_checksum = response.headers['x-amz-crc32']
            crc_checksum.to_i == Zlib.crc32(response.body_contents)
          else
            true
          end
        end

      end
    end
  end
end
