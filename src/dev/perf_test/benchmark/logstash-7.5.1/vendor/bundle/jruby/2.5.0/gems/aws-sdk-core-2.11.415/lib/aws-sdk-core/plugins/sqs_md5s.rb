require 'openssl'

module Aws
  module Plugins

    # @seahorse.client.option [Boolean] :verify_checksums (true)
    #   When `true` MD5 checksums will be computed for messages sent to
    #   an SQS queue and matched against MD5 checksums returned by Amazon SQS.
    #   `Aws::Errors::Checksum` errors are raised for cases where checksums do
    #   not match.
    class SQSMd5s < Seahorse::Client::Plugin
      OPERATIONS_TO_VERIFY = [:send_message, :send_message_batch]

      # @api private
      class Handler < Seahorse::Client::Handler
        def call(context)
          @handler.call(context).on_success do |response|
            case context.operation_name
            when :send_message
              validate_send_message(context, response)
            when :send_message_batch
              validate_send_message_batch(context, response)
            end
          end
        end

        private

        TRANSPORT_TYPE_ENCODINGS = {
          'String' => 1,
          'Binary' => 2,
          'Number' => 1
        }

        DATA_TYPE = /\A(String|Binary|Number)(\..+)?\z/

        NORMALIZED_ENCODING = Encoding::UTF_8

        def validate_send_message(context, response)
          body = context.params[:message_body]
          attributes = context.params[:message_attributes]
          validate_single_message(body, attributes, response)
        end

        def validate_send_message_batch(context, response)
          context.params[:entries].each do |entry|
            id = entry[:id]
            body = entry[:message_body]
            attributes = entry[:message_attributes]
            message_response = response.successful.select { |r| r.id == id }[0]
            unless message_response.nil?
              validate_single_message(body, attributes, message_response)
            end
          end
        end

        def validate_single_message(body, attributes, response)
          validate_body(body, response)
          unless attributes.nil? || attributes.empty?
            validate_attributes(attributes, response)
          end
        end

        def validate_body(body, response)
          calculated_md5 = md5_of_message_body(body)
          returned_md5 = response.md5_of_message_body
          if calculated_md5 != returned_md5
            error_message =  mismatch_error_message(
              'message body',
              calculated_md5,
              returned_md5,
              response)
            raise Aws::Errors::ChecksumError, error_message
          end
        end

        def validate_attributes(attributes, response)
          calculated_md5 = md5_of_message_attributes(attributes)
          returned_md5 = response.md5_of_message_attributes
          if returned_md5 != calculated_md5
            error_message =  mismatch_error_message(
              'message attributes',
              calculated_md5,
              returned_md5,
              response)
            raise Aws::Errors::ChecksumError, error_message
          end
        end

        def md5_of_message_body(message_body)
          OpenSSL::Digest::MD5.hexdigest(message_body)
        end

        def md5_of_message_attributes(message_attributes)
          encoded = { }
          message_attributes.each do |name, attribute|
            name = name.to_s
            encoded[name] = String.new
            data_type_without_label = DATA_TYPE.match(attribute[:data_type])[1]
            encoded[name] << encode_length_and_bytes(name) <<
            encode_length_and_bytes(attribute[:data_type]) <<
            [TRANSPORT_TYPE_ENCODINGS[data_type_without_label]].pack('C'.freeze)

            if attribute[:string_value] != nil
              encoded[name] << encode_length_and_string(attribute[:string_value])
            elsif attribute[:binary_value] != nil
              encoded[name] << encode_length_and_bytes(attribute[:binary_value])
            end
          end

          buffer = encoded.keys.sort.reduce(String.new) do |string, name|
            string << encoded[name]
          end
          OpenSSL::Digest::MD5.hexdigest(buffer)
        end

        def encode_length_and_string(string)
          string = String.new(string)
          string.encode!(NORMALIZED_ENCODING)
          encode_length_and_bytes(string)
        end

        def encode_length_and_bytes(bytes)
          [bytes.bytesize, bytes].pack('L>a*'.freeze)
        end

        def mismatch_error_message(section, local_md5, returned_md5, response)
          m = "MD5 returned by SQS does not match " <<
          "the calculation on the original request. ("

          if response.respond_to?(:id) && !response.id.nil?
            m << "Message ID: #{response.id}, "
          end

          m << "MD5 calculated by the #{section}: " <<
          "'#{local_md5}', MD5 checksum returned: '#{returned_md5}')"
        end
      end

      option(:verify_checksums) do |config|
        # By default, we will disable checksum verification when response
        # stubbing is enable. If a user decides to enable both features,
        # then they will need to stub the MD5s in the response.
        # See the spec/aws/sqs/client/verify_checksums_spec.rb for
        # examples of how to do this.
        if config.respond_to?(:stub_responses)
          !config.stub_responses
        else
          config.verify_checksums
        end
      end

      def add_handlers(handlers, config)
        if config.verify_checksums
          handlers.add(Handler, {
            priority: 10 ,
            step: :validate,
            operations: SQSMd5s::OPERATIONS_TO_VERIFY
          })
        end
      end
    end
  end
end
