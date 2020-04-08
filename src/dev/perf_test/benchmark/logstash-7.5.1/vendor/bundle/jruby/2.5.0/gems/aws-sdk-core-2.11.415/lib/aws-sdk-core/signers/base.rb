require 'openssl'

module Aws
  module Signers
    class Base

      # @param [Credentials] credentials
      def initialize(credentials)
        @credentials = credentials.credentials
      end

      private

      def sha256_hmac(value)
        Base64.encode64(
          OpenSSL::HMAC.digest(OpenSSL::Digest.new('sha256'),
            @credentials.secret_access_key, value)
        ).strip
      end

      class << self

        # @param [Seahorse::Client::RequestContext] context
        def sign(context)
          new(context.config.credentials).sign(context.http_request)
        end

      end
    end
  end
end
