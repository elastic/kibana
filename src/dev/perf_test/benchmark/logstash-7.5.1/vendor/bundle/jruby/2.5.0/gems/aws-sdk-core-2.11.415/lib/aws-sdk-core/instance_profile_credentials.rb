require 'json'
require 'time'
require 'net/http'

module Aws
  class InstanceProfileCredentials

    include CredentialProvider
    include RefreshingCredentials

    # @api private
    class Non200Response < RuntimeError; end

    # @api private
    class TokenRetrivalError < RuntimeError; end

    # @api private
    class TokenExpiredError < RuntimeError; end

    # @api private
    class TokenRetrivalUnavailableError < RuntimeError; end

    # These are the errors we trap when attempting to talk to the
    # instance metadata service.  Any of these imply the service
    # is not present, no responding or some other non-recoverable
    # error.
    # @api private
    NETWORK_ERRORS = [
      Errno::EHOSTUNREACH,
      Errno::ECONNREFUSED,
      Errno::EHOSTDOWN,
      Errno::ENETUNREACH,
      SocketError,
      Timeout::Error,
      Non200Response,
    ]

    # Path base for GET request for profile and credentials
    # @api private
    METADATA_PATH_BASE = '/latest/meta-data/iam/security-credentials/'

    # Path for PUT request for token
    # @api private
    METADATA_TOKEN_PATH = '/latest/api/token'

    # @param [Hash] options
    # @option options [Integer] :retries (5) Number of times to retry
    #   when retrieving credentials.
    # @option options [String] :ip_address ('169.254.169.254')
    # @option options [Integer] :port (80)
    # @option options [Float] :http_open_timeout (5)
    # @option options [Float] :http_read_timeout (5)
    # @option options [Numeric, Proc] :delay By default, failures are retried
    #   with exponential back-off, i.e. `sleep(1.2 ** num_failures)`. You can
    #   pass a number of seconds to sleep between failed attempts, or
    #   a Proc that accepts the number of failures.
    # @option options [IO] :http_debug_output (nil) HTTP wire
    #   traces are sent to this object.  You can specify something
    #   like $stdout.
    # @option options [Integer] :token_ttl (21600) Time-to-Live in seconds for
    #   EC2 Metadata Token used for fetching Metadata Profile Credentials.
    def initialize options = {}
      @retries = options[:retries] || 5
      @ip_address = options[:ip_address] || '169.254.169.254'
      @port = options[:port] || 80
      @http_open_timeout = options[:http_open_timeout] || 5
      @http_read_timeout = options[:http_read_timeout] || 5
      @http_debug_output = options[:http_debug_output]
      @backoff = backoff(options[:backoff])
      @token_ttl = options[:token_ttl] || 21600
      super
    end

    # @return [Integer] Number of times to retry when retrieving credentials
    #   from the instance metadata service. Defaults to 0 when resolving from
    #   the default credential chain ({Aws::CredentialProviderChain}).
    attr_reader :retries

    private

    def backoff(backoff)
      case backoff
      when Proc then backoff
      when Numeric then lambda { |_| sleep(backoff) }
      else lambda { |num_failures| Kernel.sleep(1.2 ** num_failures) }
      end
    end

    def refresh
      # Retry loading credentials up to 3 times is the instance metadata
      # service is responding but is returning invalid JSON documents
      # in response to the GET profile credentials call.
      begin
        retry_errors([JSON::ParserError, StandardError], max_retries: 3) do
          c = JSON.parse(get_credentials.to_s)
          @credentials = Credentials.new(
            c['AccessKeyId'],
            c['SecretAccessKey'],
            c['Token']
          )
          @expiration = c['Expiration'] ? Time.iso8601(c['Expiration']) : nil
        end
      rescue JSON::ParserError
        raise Aws::Errors::MetadataParserError.new
      end
    end

    def get_credentials
      # Retry loading credentials a configurable number of times if
      # the instance metadata service is not responding.
      if _metadata_disabled?
        '{}'
      else
        begin
          retry_errors(NETWORK_ERRORS, max_retries: @retries) do
            open_connection do |conn|
              _token_attempt(conn)
              token_value = @token.value if token_set?
              profile_name = http_get(conn, METADATA_PATH_BASE, token_value)
                .lines.first.strip
              http_get(conn, METADATA_PATH_BASE + profile_name, token_value)
            end
          end
        rescue
          '{}'
        end
      end
    end

    def token_set?
      @token && !@token.expired?
    end

    # attempt to fetch token with retries baked in
    # would be skipped if token already set
    def _token_attempt(conn)
      begin
        retry_errors(NETWORK_ERRORS, max_retries: @retries) do
          unless token_set?
            token_value, ttl = http_put(conn, METADATA_TOKEN_PATH, @token_ttl)
            @token = Token.new(token_value, ttl) if token_value && ttl
          end
        end
      rescue *NETWORK_ERRORS, TokenRetrivalUnavailableError
        # token attempt failed with allowable errors (those indicating
        # token retrieval not available on the instance), reset token to
        # allow safe failover to non-token mode
        @token = nil
      end
    end

    def _metadata_disabled?
      flag = ENV["AWS_EC2_METADATA_DISABLED"]
      !flag.nil? && flag.downcase == "true"
    end

    def open_connection
      http = Net::HTTP.new(@ip_address, @port, nil)
      http.open_timeout = @http_open_timeout
      http.read_timeout = @http_read_timeout
      http.set_debug_output(@http_debug_output) if @http_debug_output
      http.start
      yield(http).tap { http.finish }
    end

    # GET request fetch profile and credentials
    def http_get(connection, path, token=nil)
      headers = {"User-Agent" => "aws-sdk-ruby2/#{VERSION}"}
      headers["x-aws-ec2-metadata-token"] = token if token
      response = connection.request(Net::HTTP::Get.new(path, headers))
      case response.code.to_i
      when 200
        response.body
      when 401
        raise TokenExpiredError
      else
        raise Non200Response
      end
    end

    # PUT request fetch token with ttl
    def http_put(connection, path, ttl)
      headers = {
        "User-Agent" => "aws-sdk-ruby2/#{VERSION}",
        "x-aws-ec2-metadata-token-ttl-seconds" => ttl.to_s
      }
      response = connection.request(Net::HTTP::Put.new(path, headers))
      case response.code.to_i
      when 200
        [
          response.body,
          response.header["x-aws-ec2-metadata-token-ttl-seconds"].to_i
        ]
      when 400
        raise TokenRetrivalError
      when 403
      when 404
      when 405
        raise TokenRetrivalUnavailableError
      else
        raise Non200Response
      end
    end

    def retry_errors(error_classes, options = {}, &block)
      max_retries = options[:max_retries]
      retries = 0
      begin
        yield
      rescue *error_classes
        if retries < max_retries
          @backoff.call(retries)
          retries += 1
          retry
        else
          raise
        end
      end
    end

    # @api private
    # Token used to fetch IMDS profile and credentials
    class Token

      def initialize(value, ttl)
        @ttl = ttl
        @value = value
        @created_time = Time.now
      end

      # [String] token value
      attr_reader :value

      def expired?
        Time.now - @created_time > @ttl
      end

    end

  end
end
