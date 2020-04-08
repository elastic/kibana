require 'base64'
require 'uri'
require 'time'
require 'json'
require 'openssl'

module Aws
  module CloudFront

    module Signer

      # @option options [String] :key_pair_id
      # @option options [String] :private_key
      # @option options [String] :private_key_path
      def initialize(options = {})
        @key_pair_id = key_pair_id(options)
        @private_key = private_key(options)
      end

      private

      def scheme_and_uri(url)
        url_sections = url.split('://')
        if url_sections.length < 2
          raise ArgumentError, "Invaild URL:#{url}"
        end
        scheme = url_sections[0].gsub('*', '')
        uri = "#{scheme}://#{url_sections[1]}"
        [scheme, uri]
      end

      def time(expires)
        case expires
        when Time then expires.to_i
        when DateTime, Date then expires.to_time.to_i
        when String then Time.parse(expires).to_i
        when Integer, nil then expires
        else
          msg = "expected a time value for :expires, got `#{expires.class}'"
          raise ArgumentError, msg
        end
      end

      # create a relative signed URL for RTMP distribution
      def rtmp_url(uri)
        result = uri.path.gsub(' ', '/')
        result[0] = ''
        if uri.query
          "#{result}?#{uri.query}"
        else
          result
        end
      end

      # prepare resource for signing
      def resource(scheme, url)
        case scheme
        when 'http', 'http*', 'https' then url
        when 'rtmp'
          url_info = URI.parse(url)
          path = url_info.path
          path[0] = ''
          resource_content = "#{File.dirname(path)}/#{File.basename(path)}".gsub(' ', '/')
          if url_info.query
            "#{resource_content}?#{uri.query}"
          else
            resource_content
          end
        else
          msg = "Invaild URI scheme:#{scheme}.Scheme must be one of: http, https or rtmp."
          raise ArgumentError, msg
        end
      end

      # create signed values that used to construct signed URLs or Set-Cookie parameters
      # @option param [String] :resource
      # @option param [Integer<timestamp>] :expires
      # @option param [String<JSON>] :policy
      def signature(params = {})
        signature_content = {}
        if params[:policy]
          policy = params[:policy].gsub('/\s/s', '')
          signature_content['Policy'] = encode(policy)
        elsif params[:resource] && params[:expires]
          policy = canned_policy(params[:resource], params[:expires])
          signature_content['Expires'] = params[:expires]
        else
          msg = "Either a policy or a resource with an expiration time must be provided."
          raise ArgumentError, msg
        end

        signature_content['Signature'] = encode(sign_policy(policy))
        signature_content['Key-Pair-Id'] = @key_pair_id
        signature_content
      end

      # create the signature string with policy signed
      def sign_policy(policy)
        key = OpenSSL::PKey::RSA.new(@private_key)
        key.sign(OpenSSL::Digest::SHA1.new, policy)
      end

      # create canned policy that used for signing
      def canned_policy(resource, expires)
        json_hash = {
          'Statement' => [
            'Resource' => resource,
              'Condition' => {
                'DateLessThan' => {'AWS:EpochTime' => expires}
              }
          ]
        }
        JSON.dump(json_hash)
      end

      def encode(policy)
        Base64.encode64(policy).gsub(/[+=\/]/, '+' => '-', '=' => '_', '/' => '~')
      end

      def key_pair_id(options)
        if options[:key_pair_id].nil? or options[:key_pair_id] == ''
          raise ArgumentError, ":key_pair_id must not be blank"
        else
          options[:key_pair_id]
        end
      end

      def private_key(options)
        if options[:private_key]
          options[:private_key]
        elsif options[:private_key_path]
          File.open(options[:private_key_path], 'rb') { |f| f.read }
        else
          msg = ":private_key or :private_key_path should be provided"
          raise ArgumentError, msg
        end
      end

    end
  end
end
