require 'net/http'
require 'uri'
require 'socket'
require 'json'

# Log to any HTTP(S) server that accepts log messages in JSON form
#
# Features:
# * JSON Formatted messages.
# * Uses a persistent http connection, if the server supports it.
# * SSL encryption (https).
#
# Example:
#   SemanticLogger.add_appender(
#     appender: :http,
#     url:      'http://localhost:8088/path'
#   )
class SemanticLogger::Appender::Http < SemanticLogger::Subscriber
  attr_accessor :username, :application, :host, :compress, :header,
    :open_timeout, :read_timeout, :continue_timeout
  attr_reader :http, :url, :server, :port, :path, :ssl_options

  # Create HTTP(S) log appender
  #
  # Parameters:
  #   url: [String]
  #     Valid URL to post to.
  #       Example: http://example.com/some_path
  #     To enable SSL include https in the URL.
  #       Example: https://example.com/some_path
  #       verify_mode will default: OpenSSL::SSL::VERIFY_PEER
  #
  #   application: [String]
  #     Name of this application to appear in log messages.
  #     Default: SemanticLogger.application
  #
  #   host: [String]
  #     Name of this host to appear in log messages.
  #     Default: SemanticLogger.host
  #
  #   username: [String]
  #     User name for basic Authentication.
  #     Default: nil ( do not use basic auth )
  #
  #   password: [String]
  #     Password for basic Authentication.
  #
  #   compress: [true|false]
  #     Whether to compress the JSON string with GZip.
  #     Default: false
  #
  #   ssl: [Hash]
  #     Specific SSL options: For more details see NET::HTTP.start
  #       ca_file, ca_path, cert, cert_store, ciphers, key, ssl_timeout,
  #       ssl_version, verify_callback, verify_depth and verify_mode.
  #
  #   level: [:trace | :debug | :info | :warn | :error | :fatal]
  #     Override the log level for this appender.
  #     Default: SemanticLogger.default_level
  #
  #   formatter: [Object|Proc]
  #     An instance of a class that implements #call, or a Proc to be used to format
  #     the output from this appender
  #     Default: Use the built-in formatter (See: #call)
  #
  #   filter: [Regexp|Proc]
  #     RegExp: Only include log messages where the class name matches the supplied.
  #     regular expression. All other messages will be ignored.
  #     Proc: Only include log messages where the supplied Proc returns true
  #           The Proc must return true or false.
  #
  #   open_timeout: [Float]
  #     Default: 2.0
  #
  #   read_timeout: [Float]
  #     Default: 1.0
  #
  #   continue_timeout: [Float]
  #     Default: 1.0
  def initialize(options, &block)
    options           = options.dup
    @url              = options.delete(:url)
    @ssl_options      = options.delete(:ssl)
    @username         = options.delete(:username)
    @password         = options.delete(:password)
    @compress         = options.delete(:compress) || false
    @open_timeout     = options.delete(:open_timeout) || 2.0
    @read_timeout     = options.delete(:read_timeout) || 1.0
    @continue_timeout = options.delete(:continue_timeout) || 1.0

    raise(ArgumentError, 'Missing mandatory parameter :url') unless @url

    @header                     = {
      'Accept'       => 'application/json',
      'Content-Type' => 'application/json',
      # On Ruby v2.0 and greater, Net::HTTP.new already uses a persistent connection if the server allows it
      'Connection'   => 'keep-alive',
      'Keep-Alive'   => '300'
    }
    @header['Content-Encoding'] = 'gzip' if @compress

    uri     = URI.parse(@url)
    @server = uri.host
    raise(ArgumentError, "Invalid format for :url: #{@url.inspect}. Should be similar to: 'http://hostname:port/path'") unless @url

    @port     = uri.port
    @username = uri.user if !@username && uri.user
    @password = uri.password if !@password && uri.password
    @path     = uri.path

    if uri.scheme == 'https'
      @ssl_options               ||= {}
      @ssl_options[:use_ssl]     = true
      @ssl_options[:verify_mode] ||= OpenSSL::SSL::VERIFY_PEER
      @port                      ||= HTTP.https_default_port
    else
      @port ||= HTTP.http_default_port
    end
    @http = nil

    # Pass on the level and custom formatter if supplied
    super(options)
    reopen
  end

  # Re-open after process fork
  def reopen
    # Close open connection if any
    begin
      @http.finish if @http
    rescue IOError
    end

    @http = Net::HTTP.new(server, port)

    if @ssl_options
      @http.methods.grep(/\A(\w+)=\z/) do |meth|
        key = $1.to_sym
        @ssl_options.key?(key) or next
        @http.__send__(meth, @ssl_options[key])
      end
    end

    @http.open_timeout     = @open_timeout
    @http.read_timeout     = @read_timeout
    @http.continue_timeout = @continue_timeout
    @http.start
  end

  # Forward log messages to HTTP Server
  def log(log)
    return false unless should_log?(log)

    post(formatter.call(log, self))
  end

  private

  # Use JSON Formatter by default
  def default_formatter
    SemanticLogger::Formatters::Json.new
  end

  def compress_data(data)
    str = StringIO.new
    gz  = Zlib::GzipWriter.new(str)
    gz << data
    gz.close
    str.string
  end

  # HTTP Post
  def post(body, request_uri = path)
    request = Net::HTTP::Post.new(request_uri, @header)
    process_request(request, body)
  end

  # HTTP Put
  def put(body, request_uri = path)
    request = Net::HTTP::Put.new(request_uri, @header)
    process_request(request, body)
  end

  # HTTP Delete
  def delete(request_uri = path)
    request = Net::HTTP::Delete.new(request_uri, @header)
    process_request(request)
  end

  # Process HTTP Request
  def process_request(request, body = nil)
    if body
      body         = compress_data(body) if compress
      request.body = body
    end
    request.basic_auth(@username, @password) if @username
    response = @http.request(request)
    if response.code == '200' || response.code == '201'
      true
    else
      # Failures are logged to the global semantic logger failsafe logger (Usually stderr or file)
      SemanticLogger::Logger.logger.error("Bad HTTP response from: #{url} code: #{response.code}, #{response.body}")
      false
    end
  end

end
