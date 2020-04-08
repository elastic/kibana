require 'net/http'
require 'openssl'
require 'base64'

module Aws
  module SNS

    # A utility class that can be used to verify the authenticity of messages
    # sent by Amazon SNS.
    #
    #     verifier = Aws::SNS::MessageVerifier.new
    #
    #     # returns true/false
    #     verifier.authentic?(message_body)
    #
    #     # raises a Aws::SNS::MessageVerifier::VerificationError on failure
    #     verifier.authenticate!(message_body)
    #
    # You can re-use a single {MessageVerifier} instance to authenticate
    # multiple SNS messages.
    class MessageVerifier

      class VerificationError < StandardError; end

      # @api private
      SIGNABLE_KEYS = [
        'Message',
        'MessageId',
        'Subject',
        'SubscribeURL',
        'Timestamp',
        'Token',
        'TopicArn',
        'Type',
      ].freeze

      # @api private
      AWS_HOSTNAMES = [
        /^sns\.[a-zA-Z0-9\-]{3,}\.amazonaws\.com(\.cn)?$/
      ]

      def initialize
        @cached_pems = {}
      end

      # @param [String<JSON>] message_body
      # @return [Boolean] Returns `true` if the given message has been
      #   successfully verified. Returns `false` otherwise.
      def authentic?(message_body)
        authenticate!(message_body)
      rescue VerificationError
        false
      end

      # @param [String<JSON>] message_body
      # @return [Boolean] Returns `true` when the given message has been
      #   successfully verified.
      # @raise [VerificationError] Raised when the given message has failed
      #   verification.
      def authenticate!(message_body)
        msg = Json.load(message_body)
        msg = convert_lambda_msg(msg) if is_from_lambda(msg)
        if public_key(msg).verify(sha1, signature(msg), canonical_string(msg))
          true
        else
          msg = 'the authenticity of the message cannot be verified'
          raise VerificationError, msg
        end
      end

      private

      def is_from_lambda(message)
        message.key? 'SigningCertUrl'
      end

      def convert_lambda_msg(message)
        cert_url = message.delete('SigningCertUrl')
        unsubscribe_url = message.delete('UnsubscribeUrl')

        message['SigningCertURL'] = cert_url
        message['UnsubscribeURL'] = unsubscribe_url
        message
      end

      def sha1
        OpenSSL::Digest::SHA1.new
      end

      def signature(message)
        Base64.decode64(message['Signature'])
      end

      def canonical_string(message)
        parts = []
        SIGNABLE_KEYS.each do |key|
          value = message[key]
          unless value.nil? or value.empty?
            parts << "#{key}\n#{value}\n"
          end
        end
        parts.join
      end

      def public_key(message)
        x509_url = URI.parse(message['SigningCertURL'])
        x509 = OpenSSL::X509::Certificate.new(pem(x509_url))
        OpenSSL::PKey::RSA.new(x509.public_key)
      end

      def pem(uri)
        if @cached_pems[uri.to_s]
          @cached_pems[uri.to_s]
        else
          @cached_pems[uri.to_s] = download_pem(uri)
        end
      end

      def download_pem(uri)
        verify_uri!(uri)
        https_get(uri)
      end

      def verify_uri!(uri)
        verify_https!(uri)
        verify_hosted_by_aws!(uri)
        verify_pem!(uri)
      end

      def verify_https!(uri)
        unless uri.scheme == 'https'
          msg = "the SigningCertURL must be https, got: #{uri}"
          raise VerificationError, msg
        end
      end

      def verify_hosted_by_aws!(uri)
        unless AWS_HOSTNAMES.any? { |pattern| pattern.match(uri.host) }
          msg = "signing cert is not hosted by AWS: #{uri}"
          raise VerificationError, msg
        end
      end

      def verify_pem!(uri)
        unless File.extname(uri.path) == '.pem'
          msg = "the SigningCertURL must link to a .pem file"
          raise VerificationError, msg
        end
      end

      def https_get(uri, failed_attempts = 0)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.verify_mode = OpenSSL::SSL::VERIFY_PEER
        http.start
        resp = http.request(Net::HTTP::Get.new(uri.request_uri))
        http.finish
        if resp.code == '200'
          resp.body
        else
          raise VerificationError, resp.body
        end
      rescue => error
        failed_attempts += 1
        retry if failed_attempts < 3
        raise VerificationError, error.message
      end

    end
  end
end
