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

require 'pathname'

module AWS
  module Core

    # # Log Formatters
    #
    # Log formatters receive a {AWS::Core::Response} object and return
    # a log message.  When you construct a {LogFormatter}, you provide
    # a pattern string with substitutions.
    #
    #     pattern = '[AWS :http_response_status] :service :operation :duration'
    #     formatter = AWS::Core::LogFormatter.new(pattern)
    #     formatter.format(response)
    #     #=> '[AWS 200] EC2 get_bucket 0.0352'
    #
    # # AWS Configuration
    #
    # AWS.config provides a {LogFormatter.default} log formatter.  You can
    # repace this formatter by building your own and then passing it
    # to {AWS.config}.
    #
    #     pattern = '[AWS :http_response_status] :service :operation :duration'
    #     AWS.config(:log_formatter => AWS::Core::LogFormatter.new(pattern)
    #
    # ## Canned Formatters
    #
    # Instead of providing your own pattern, you can choose a canned log
    # formatter.
    #
    #     AWS.config(:log_formatter => AWS::Core::LogFormatter.colored)
    #
    # Here is the list of canned formatters.
    #
    # * {LogFormatter.default}
    # * {LogFormatter.short}
    # * {LogFormatter.debug}
    # * {LogFormatter.colored}
    #
    # # Pattern Substitutions
    #
    # You can put any of these placeholders into you pattern.
    #
    #   * `:service` - The AWS service name (e.g. 'S3', 'EC2', 'SimpleDB', etc)
    #   * `:region` - The AWS region name (e.g. 'us-west-1', 'us-west-2', etc)
    #   * `:operation` - The name of the client request method.  This maps to
    #     the name of the serivce API operation (e.g. :describe_instances).
    #   * `:options` - The hash of options passed to the client request method.
    #     Long strings are truncated/summarized if they excede the log
    #     formatters {#max_string_size}.  Other objects are inspected.
    #   * `:retry_count` - The number of times a client request was retried.
    #     Throttlings and service errors trigger the automatic retry logic.
    #     This value indicates how many extra attempts were made before
    #     getting a successful response or giving up.
    #   * `:duration` - The time it took to generate a response, expressed
    #     in decimal seconds.  This time includes everything from
    #     calling the client request method, until that method returns
    #     a value (event retries and retry delays).
    #   * `:error_class` - The class name of the error returned by the
    #     service.  If no error was returned, this will be replcaed by
    #     an empty string.
    #   * `:error_message` - The message of the error returned.  If
    #     no error was returned by the service, this will be an empty
    #     string.
    #   * `:http_request_method` - The HTTP request verb (e.g. 'POST',
    #     'PUT', 'GET', etc).
    #   * `:http_request_protocol` - This is replaced by 'http' or 'https'.
    #   * `:http_request_host` - The host name of the http request
    #     endpoint (e.g. 's3.amazon.com').
    #   * `:http_request_port` - The port number (e.g. '443' or '80').
    #   * `:http_request_uri` - The http request uri folling the host (e.g.
    #     '/bucket_name/objects/key?versions').
    #   * `:http_request_body` - The http request payload.
    #   * `:http_request_headers` - The http request headers, inspected.
    #   * `:http_request_proxy_uri` - The proxy uri used, or an empty string.
    #   * `:http_response_status` - The http response status
    #     code (e.g. '200', '404', '500', etc).
    #   * `:http_response_headers` - The http response headers, inspected.
    #   * `:http_response_body` - The http response body contents.
    #
    class LogFormatter

      # @param [String] pattern The log format pattern should be a string
      #   and may contain any of the following placeholders:
      #
      #     * `:service`
      #     * `:region`
      #     * `:operation`
      #     * `:options`
      #     * `:retry_count`
      #     * `:duration`
      #     * `:error_class`
      #     * `:error_message`
      #     * `:http_request_method`
      #     * `:http_request_protocol`
      #     * `:http_request_host`
      #     * `:http_request_port`
      #     * `:http_request_uri`
      #     * `:http_request_body`
      #     * `:http_request_headers`
      #     * `:http_request_proxy_uri`
      #     * `:http_response_status`
      #     * `:http_response_headers`
      #     * `:http_response_body`
      #
      # @param [Hash] options
      #
      # @option options [Integer] :max_string_size (1000)
      #
      def initialize pattern, options = {}
        @pattern = pattern
        @max_string_size = options[:max_string_size] || 1000
      end

      # @return [String]
      attr_reader :pattern

      # @return [Integer]
      attr_reader :max_string_size

      # @param [Response] response
      # @return [String]
      def format response
        pattern.gsub(/:(\w+)/) {|sym| send("_#{sym[1..-1]}", response) }
      end

      # @api private
      def eql? other
        other.is_a?(self.class) and other.pattern == self.pattern
      end
      alias_method :==, :eql?

      protected

      def method_missing method_name, *args
        if method_name.to_s.chars.first == '_'
          ":#{method_name.to_s[1..-1]}"
        else
          super
        end
      end

      def _service response
        response.http_request.service
      end

      def _region response
        response.http_request.region
      end

      def _operation response
        response.request_type
      end

      def _options response
        summarize_hash(response.request_options) if response.request_options
      end

      def _retry_count response
        response.retry_count
      end

      def _duration response
        ("%.06f" % response.duration).sub(/0+$/, '')
      end

      def _error_class response
        response.error.class.name if response.error
      end

      def _error_message response
        response.error.message if response.error
      end

      def _http_request_method response
        response.http_request.http_method
      end

      def _http_request_protocol response
        response.http_request.use_ssl? ? 'https' : 'http'
      end

      def _http_request_host response
        response.http_request.host
      end

      def _http_request_port response
        response.http_request.port
      end

      def _http_request_uri response
        response.http_request.uri
      end

      def _http_request_headers response
        response.http_request.headers.inspect
      end

      def _http_request_body response
        response.http_request.body
      end

      def _http_request_proxy_uri response
        response.config.proxy_uri
      end

      def _http_response_status response
        response.http_response.status
      end

      def _http_response_headers response
        response.http_response.headers.inspect
      end

      def _http_response_body response
        response.http_response.body
      end

      # The following methods are for summarizing request options that have
      # symbolized keys and a mix of values.  The summarizing is important
      # because large request options (e.g. s3 data) can cause memory usage
      # to spike if it is inspected.

      # @param [Hash] hash
      # @return [String]
      def summarize_hash hash
        hash.map do |key,v|
          "#{key.inspect}=>#{summarize_value(v)}"
        end.sort.join(",")
      end

      # @param [Object] value
      # @return [String]
      def summarize_value value
        case value
        when String   then summarize_string(value)
        when Hash     then '{' + summarize_hash(value) + '}'
        when Array    then summarize_array(value)
        when File     then summarize_file(value.path)
        when Pathname then summarize_file(value)
        else value.inspect
        end
      end

      # @param [String] str
      # @return [String]
      def summarize_string str
        max = max_string_size
        if str.size > max
          "#<String #{str[0...max].inspect} ... (#{str.size} bytes)>"
        else
          str.inspect
        end
      end

      # Given the path to a file on disk, this method returns a summarized
      # inspecton string that includes the file size.
      # @param [String] path
      # @return [String]
      def summarize_file path
        "#<File:#{path} (#{File.size(path)} bytes)>"
      end

      # @param [Array] array
      # @return [String]
      def summarize_array array
        "[" + array.map{|v| summarize_value(v) }.join(",") + "]"
      end

      class << self

        # The default log format.
        #
        # @example A sample of the default format.
        #
        #     [AWS SimpleEmailService 200 0.580066 0 retries] list_verified_email_addresses()
        #
        # @return [LogFormatter]
        #
        def default

          pattern = []
          pattern << "[AWS"
          pattern << ":service"
          pattern << ":http_response_status"
          pattern << ":duration"
          pattern << ":retry_count retries]"
          pattern << ":operation(:options)"
          pattern << ":error_class"
          pattern << ":error_message"

          LogFormatter.new(pattern.join(' ') + "\n")

        end

        # The short log format.  Similar to default, but it does not
        # inspect the request params or report on retries.
        #
        # @example A sample of the short format
        #
        #     [AWS SimpleEmailService 200 0.494532] list_verified_email_addresses
        #
        # @return [LogFormatter]
        #
        def short

          pattern = []
          pattern << "[AWS"
          pattern << ":service"
          pattern << ":http_response_status"
          pattern << ":duration]"
          pattern << ":operation"
          pattern << ":error_class"

          LogFormatter.new(pattern.join(' ') + "\n")

        end

        # A debug format that dumps most of the http request and response
        # data.
        #
        # @example A truncated sample of the debug format.
        #
        #   +-------------------------------------------------------------------------------
        #   | AWS us-east-1 SimpleEmailService list_verified_email_addresses 0.429189 0 retries
        #   +-------------------------------------------------------------------------------
        #   |   REQUEST
        #   +-------------------------------------------------------------------------------
        #   |    METHOD: POST
        #   |       URL: https://email.us-east-1.amazonaws.com::443:/
        #   |   HEADERS: {"content-type"=>"application/x-www-form-urlencoded" ...
        #   |      BODY: Action=ListVerifiedEmailAddresses&Timestamp= ...
        #   +-------------------------------------------------------------------------------
        #   |  RESPONSE
        #   +-------------------------------------------------------------------------------
        #   |    STATUS: 200
        #   |   HEADERS: {"x-amzn-requestid"=>["..."], ...
        #   |      BODY: <ListVerifiedEmailAddressesResponse ...
        #
        # @return [LogFormatter]
        #
        def debug

          sig_pattern = []
          sig_pattern << ':region'
          sig_pattern << ':service'
          sig_pattern << ':operation'
          sig_pattern << ':duration'
          sig_pattern << ':retry_count retries'

          uri_pattern = []
          uri_pattern << ':http_request_protocol'
          uri_pattern << '://'
          uri_pattern << ':http_request_host'
          uri_pattern << '::'
          uri_pattern << ':http_request_port'
          uri_pattern << ':'
          uri_pattern << ':http_request_uri'

          line = "+" + '-' * 79

          pattern = []
          pattern << line
          pattern << "| AWS #{sig_pattern.join(' ')}"
          pattern << line
          pattern << "|   REQUEST"
          pattern << line
          pattern << "|    METHOD: :http_request_method"
          pattern << "|       URL: #{uri_pattern.join}"
          pattern << "|   HEADERS: :http_request_headers"
          pattern << "|      BODY: :http_request_body"
          pattern << line
          pattern << "|  RESPONSE"
          pattern << line
          pattern << "|    STATUS: :http_response_status"
          pattern << "|   HEADERS: :http_response_headers"
          pattern << "|      BODY: :http_response_body"

          LogFormatter.new(pattern.join("\n") + "\n")

        end

        # The default log format with ANSI colors.
        #
        # @example A sample of the colored format (sans the ansi colors).
        #
        #     [AWS SimpleEmailService 200 0.580066 0 retries] list_verified_email_addresses()
        #
        # @return [LogFormatter]
        #
        def colored

          bold = "\x1b[1m"
          color = "\x1b[34m"
          reset = "\x1b[0m"

          pattern = []
          pattern << "#{bold}#{color}[AWS"
          pattern << ":service"
          pattern << ":http_response_status"
          pattern << ":duration"
          pattern << ":retry_count retries]#{reset}#{bold}"
          pattern << ":operation(:options)"
          pattern << ":error_class"
          pattern << ":error_message#{reset}"

          LogFormatter.new(pattern.join(' ') + "\n")

        end

      end

    end
  end
end
