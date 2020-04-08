# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

require 'time'
require 'openssl'
require 'digest'

module AWS
  module Core
    module Signers
      # @api private
      class Version4

        autoload :ChunkSignedStream, 'aws/core/signers/version_4/chunk_signed_stream'

        # @api private
        # SHA256 hex digest of the empty string
        EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

        # @api private
        STREAMING_CHECKSUM = "STREAMING-AWS4-HMAC-SHA256-PAYLOAD"

        # @param [CredentialProviders::Provider] credentials
        # @param [String] service_name
        # @param [String] region
        def initialize credentials, service_name, region
          @credentials = credentials
          @service_name = service_name
          @region = region
        end

        # @return [CredentialProviders::Provider]
        attr_reader :credentials

        # @return [String]
        attr_reader :service_name

        # @return [String]
        attr_reader :region

        # @param [Http::Request] req
        # @option options [Boolean] :chunk_signing (false) When +true+, the
        #   request body will be signed in chunk.
        # @option options [DateTime String<YYYYMMDDTHHMMSSZ>] :datetime
        # @return [Http::Request]
        def sign_request req, options = {}
          datetime = options[:datetime] || Time.now.utc.strftime("%Y%m%dT%H%M%SZ")
          key = derive_key(datetime)
          token = credentials.session_token
          chunk_signing = !!options[:chunk_signing]
          content_sha256 = req.headers['x-amz-content-sha256'] || body_digest(req, chunk_signing)

          req.headers['host'] = req.host
          req.headers['x-amz-date'] = datetime
          req.headers['x-amz-security-token'] = token if token
          req.headers['x-amz-content-sha256'] = content_sha256

          if chunk_signing
            orig_size = req.headers['content-length'].to_i
            signed_size = ChunkSignedStream.signed_size(orig_size.to_i)
            req.headers['content-length'] = signed_size.to_s
            req.headers['x-amz-decoded-content-length'] = orig_size.to_s
          end

          req.headers['authorization'] = authorization(req, key, datetime, content_sha256)

          req.body_stream = chunk_signed_stream(req, key) if chunk_signing

          req
        end

        def signature(request, key, datetime, content_sha256)
          string = string_to_sign(request, datetime, content_sha256)
          hexhmac(key, string)
        end

        def credential(datetime)
          "#{credentials.access_key_id}/#{key_path(datetime)}"
        end

        def derive_key(datetime)
          k_secret = credentials.secret_access_key
          k_date = hmac("AWS4" + k_secret, datetime[0,8])
          k_region = hmac(k_date, region)
          k_service = hmac(k_region, service_name)
          k_credentials = hmac(k_service, 'aws4_request')
        end

        private

        # Wraps the req body stream with another stream.  The wrapper signs
        # the original body as it is read, injecting signatures of indiviaul
        # chunks into the resultant stream.
        # @param [Http::Request] req
        # @param [String] key
        # @param [String] datetime
        def chunk_signed_stream req, key
          args = []
          args << req.body_stream
          args << req.headers['x-amz-decoded-content-length'].to_i
          args << key
          args << key_path(req.headers['x-amz-date'])
          args << req.headers['x-amz-date']
          args << req.headers['authorization'].split('Signature=')[1]
          ChunkSignedStream.new(*args)
        end

        def authorization req, key, datetime, content_sha256
          parts = []
          parts << "AWS4-HMAC-SHA256 Credential=#{credential(datetime)}"
          parts << "SignedHeaders=#{signed_headers(req)}"
          parts << "Signature=#{signature(req, key, datetime, content_sha256)}"
          parts.join(', ')
        end

        def string_to_sign req, datetime, content_sha256
          parts = []
          parts << 'AWS4-HMAC-SHA256'
          parts << datetime
          parts << key_path(datetime)
          parts << hexdigest(canonical_request(req, content_sha256))
          parts.join("\n")
        end

        # @param [String] datetime
        # @return [String] the signature scope.
        def key_path datetime
          parts = []
          parts << datetime[0,8]
          parts << region
          parts << service_name
          parts << 'aws4_request'
          parts.join("/")
        end

        # @param [Http::Request] req
        def canonical_request req, content_sha256
          parts = []
          parts << req.http_method
          parts << req.path
          parts << req.querystring
          parts << canonical_headers(req) + "\n"
          parts << signed_headers(req)
          parts << content_sha256
          parts.join("\n")
        end

        # @param [Http::Request] req
        def signed_headers req
          to_sign = req.headers.keys.map{|k| k.to_s.downcase }
          to_sign.delete('authorization')
          to_sign.sort.join(";")
        end

        # @param [Http::Request] req
        def canonical_headers req
          headers = []
          req.headers.each_pair do |k,v|
            headers << [k,v] unless k == 'authorization'
          end
          headers = headers.sort_by(&:first)
          headers.map{|k,v| "#{k}:#{canonical_header_values(v)}" }.join("\n")
        end

        # @param [String,Array<String>] values
        def canonical_header_values values
          values = [values] unless values.is_a?(Array)
          values.map(&:to_s).join(',').gsub(/\s+/, ' ').strip
        end

        # @param [Http::Request] req
        # @param [Boolean] chunk_signing
        # @return [String]
        def body_digest req, chunk_signing
          case
          when chunk_signing then STREAMING_CHECKSUM
          when ['', nil].include?(req.body) then EMPTY_DIGEST
          else hexdigest(req.body)
          end
        end

        # @param [String] value
        # @return [String]
        def hexdigest value
          digest = OpenSSL::Digest::SHA256.new
          if value.respond_to?(:read)
            chunk = nil
            chunk_size = 1024 * 1024 # 1 megabyte
            digest.update(chunk) while chunk = value.read(chunk_size)
            value.rewind
          else
            digest.update(value)
          end
          digest.hexdigest
        end

        # @param [String] key
        # @param [String] value
        # @return [String]
        def hmac key, value
          OpenSSL::HMAC.digest(sha256_digest, key, value)
        end

        # @param [String] key
        # @param [String] value
        # @return [String]
        def hexhmac key, value
          OpenSSL::HMAC.hexdigest(sha256_digest, key, value)
        end

        def sha256_digest
          OpenSSL::Digest.new('sha256')
        end

      end
    end
  end
end
