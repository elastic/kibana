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

require 'net/http'
require 'net/https'
require 'thread'
require 'logger'

module AWS
  module Core
    module Http

      # @attr_reader [URI::HTTP,nil] proxy_uri Returns the configured proxy uri.
      # @attr_reader [Float,nil] http_continue_timeout
      # @attr_reader [Integer,Float] http_idle_timeout
      # @attr_reader [Integer,Float] http_open_timeout
      # @attr_reader [Integer,Float] http_read_timeout
      # @attr_reader [Boolean] http_wire_trace
      # @attr_reader [Logger,nil] logger
      # @attr_reader [Boolean] ssl_verify_peer
      # @attr_reader [String,nil] ssl_ca_file
      # @attr_reader [String,nil] ssl_ca_path
      # @attr_reader [String,nil] ssl_cert_store
      # @api private
      class ConnectionPool

        @pools_mutex = Mutex.new
        @pools = {}

        # @api private
        OPTIONS = [
          :proxy_uri,
          :http_continue_timeout,
          :http_idle_timeout,
          :http_open_timeout,
          :http_read_timeout,
          :http_wire_trace,
          :logger,
          :ssl_verify_peer,
          :ssl_ca_file,
          :ssl_ca_path,
          :ssl_cert_store,
        ]

        OPTIONS.each do |attr_name|
          attr_reader(attr_name)
        end

        alias_method :http_wire_trace?, :http_wire_trace

        alias_method :ssl_verify_peer?, :ssl_verify_peer

        # @api private
        def initialize options = {}
          # user supplied options are filtered by the class .for method
          options.each_pair do |opt_name, opt_value|
            instance_variable_set("@#{opt_name}", opt_value)
          end

          # connection pool
          @pool_mutex = Mutex.new
          @pool = Hash.new do |pool,endpoint|
            pool[endpoint] = []
            pool[endpoint]
          end
        end

        # @return [Hash] a read-only hash of options for this pool.
        def options
          OPTIONS.inject({}) do |options, opt_name|
            options[opt_name] = send(opt_name)
            options
          end.freeze
        end

        # Makes an HTTP request, yielding a Net::HTTPResponse object.
        #
        #   pool.request('http://google.com', Net::HTTP::Get.new('/')) do |resp|
        #     puts resp.code # status code
        #     puts resp.to_h.inspect # dump the headers
        #     puts resp.body
        #   end
        #
        # @param [URI::HTTP,URI::HTTPS,String] endpoint The HTTP(S) endpoint to
        #    connect to (e.g. 'https://domain.com').
        #
        # @param [Net::HTTPRequest] request The request to make.  This can be 
        #   any request object from Net::HTTP (e.g. Net::HTTP::Get,
        #   Net::HTTP::POST, etc).
        #
        # @yieldparam [Net::HTTPResponse] net_http_response
        #
        # @return (see #session_for
        def request endpoint, request, &block
          session_for(endpoint) do |http|
            yield(http.request(request))
          end
        end

        # @param [URI::HTTP,URI::HTTPS,String] endpoint The HTTP(S) endpoint to
        #    connect to (e.g. 'https://domain.com').
        #
        # @yieldparam [Net::HTTPSession] session
        #
        # @return [nil]
        def session_for endpoint, &block
          endpoint = endpoint.to_s
          session = nil

          # attempt to recycle an already open session
          @pool_mutex.synchronize do
            _clean
            session = @pool[endpoint].shift
          end

          begin
            session ||= start_session(endpoint)
            session.read_timeout = http_read_timeout
            session.continue_timeout = http_continue_timeout if
              session.respond_to?(:continue_timeout=)
            yield(session)
          rescue Exception => error
            session.finish if session
            raise error
          else
            # No error raised? Good, check the session into the pool.
            @pool_mutex.synchronize { @pool[endpoint] << session }
          end
          nil
        end

        # @return [Integer] Returns the count of sessions currently in the pool,
        #   not counting those currently in use.
        def size
          @pool_mutex.synchronize do
            size = 0
            @pool.each_pair do |endpoint,sessions|
              size += sessions.size
            end
            size
          end
        end

        # Removes stale http sessions from the pool (that have exceeded
        # the idle timeout).
        # @return [nil]
        def clean!
          @pool_mutex.synchronize { _clean }
          nil
        end

        # Closes and removes removes all sessions from the pool.
        # If empty! is called while there are outstanding requests they may
        # get checked back into the pool, leaving the pool in a non-empty state.
        # @return [nil]
        def empty!
          @pool_mutex.synchronize do
            @pool.each_pair do |endpoint,sessions|
              sessions.each(&:finish)
            end
            @pool.clear
          end
          nil
        end

        class << self

          # Returns a connection pool constructed from the given options.
          # Calling this method twice with the same options will return
          # the same pool.
          #
          # @option options [URI::HTTP,String] :proxy_uri A proxy to send 
          #   requests through.  Formatted like 'http://proxy.com:123'.
          #
          # @option options [Float] :http_continue_timeout (nil) The number of
          #   seconds to wait for a 100-continue response before sending the
          #   request body.  This option has no effect unless the request has
          #   "Expect" header set to "100-continue".  Defaults to `nil` which
          #   disables this behaviour.  This value can safely be set per-request
          #   on the session yeidled by {#session_for}.
          #
          # @option options [Float] :http_idle_timeout (15) The number of
          #   seconds a connection is allowed to sit idble before it is
          #   considered stale.  Stale connections are closed and removed
          #   from the pool before making a request.
          #
          # @option options [Float] :http_open_timeout (15) The number of
          #   seconds to wait when opening a HTTP session before rasing a
          #   `Timeout::Error`.
          #
          # @option options [Integer] :http_read_timeout (60) The default
          #   number of seconds to wait for response data.  This value can
          #   safely be set
          #   per-request on the session yeidled by {#session_for}.
          #
          # @option options [Boolean] :http_wire_trace (false) When `true`, HTTP
          #   debug output will be sent to the `:logger`.
          #
          # @option options [Logger] :logger Where debug output is sent.
          #    Defaults to `nil` when `:http_wire_trace` is `false`.
          #    Defaults to `Logger.new($stdout)` when `:http_wire_trace` is
          #    `true`.
          #
          # @option options [Boolean] :ssl_verify_peer (true) When `true`, SSL
          #   peer certificates are verified when establishing a connection.
          #
          # @option options [String] :ssl_ca_file Full path to the SSL
          #   certificate authority bundle file that should be used when
          #   verifying peer certificates.  If you do not pass
          #   `:ssl_ca_file` or `:ssl_ca_path` the the system default will be
          #   used if available.
          #
          # @option options [String] :ssl_ca_path Full path of the directory
          #   that contains the unbundled SSL certificate authority files#
          #   for verifying peer certificates.  If you do not pass
          #   `:ssl_ca_file` or `:ssl_ca_path` the the system default will
          #   be used if available.
          #
          # @option options [String] :ssl_cert_store
          #
          # @return [ConnectionPool]
          def new options = {}
            options = pool_options(options)
            @pools_mutex.synchronize do
              @pools[options] ||= build(options)
            end
          end

          # Constructs and returns a new connection pool.  This pool is never
          # shared.
          # @option (see new)
          # @return [ConnectionPool]
          def build(options = {})
            pool = allocate
            pool.send(:initialize, pool_options(options))
            pool
          end

          # @return [Array<ConnectionPool>] Returns a list of of the constructed
          #   connection pools.
          def pools
            @pools.values
          end

          private

          # Filters an option hash, merging in default values.
          # @return [Hash]
          def pool_options options
            wire_trace = !!options[:http_wire_trace]
            logger = options[:logger] || Logger.new($stdout) if wire_trace
            verify_peer = options.key?(:ssl_verify_peer) ?
              !!options[:ssl_verify_peer] : true
            {
              :proxy_uri => URI.parse(options[:proxy_uri].to_s),
              :http_continue_timeout => options[:http_continue_timeout],
              :http_open_timeout => options[:http_open_timeout] || 15,
              :http_idle_timeout => options[:http_idle_timeout] || 15,
              :http_read_timeout => options[:http_read_timeout] || 60,
              :http_wire_trace => wire_trace,
              :logger => logger,
              :ssl_verify_peer => verify_peer,
              :ssl_ca_file => options[:ssl_ca_file],
              :ssl_ca_path => options[:ssl_ca_path],
              :ssl_cert_store => options[:ssl_cert_store],
            }
          end

        end

        private

        # Starts and returns a new HTTP(S) session.
        # @param [String] endpoint
        # @return [Net::HTTPSession]
        def start_session endpoint

          endpoint = URI.parse(endpoint)

          args = []
          args << endpoint.host
          args << endpoint.port
          args << proxy_uri.host
          args << proxy_uri.port
          
          if proxy_uri.user
            args << URI::decode(proxy_uri.user)
          else
            args << nil
          end
          
          if proxy_uri.password
            args << URI::decode(proxy_uri.password)
          else 
            args << nil
          end

          http = Net::HTTP.new(*args.compact)
          http.extend(SessionExtensions)
          http.set_debug_output(logger) if http_wire_trace?
          http.open_timeout = http_open_timeout

          if endpoint.scheme == 'https'
            http.use_ssl = true
            if ssl_verify_peer?
              http.verify_mode = OpenSSL::SSL::VERIFY_PEER
              http.ca_file = ssl_ca_file if ssl_ca_file
              http.ca_path = ssl_ca_path if ssl_ca_path
              http.cert_store = ssl_cert_store if ssl_cert_store
            else
              http.verify_mode = OpenSSL::SSL::VERIFY_NONE
            end
          else
            http.use_ssl = false
          end

          http.start
          http
        end

        # Removes stale sessions from the pool.  This method *must* be called
        # @note **Must** be called behind a `@pool_mutex` synchronize block.
        def _clean
          now = Time.now
          @pool.each_pair do |endpoint,sessions|
            sessions.delete_if do |session|
              if
                session.last_used.nil? or
                now - session.last_used > http_idle_timeout
              then
                session.finish
                true
              end
            end
          end
        end

        # Helper methods extended onto Net::HTTPSession objects opend by the
        # connection pool.
        # @api private
        module SessionExtensions

          # Sends the request and tracks that this session has been used.
          def request *args, &block
            @last_used = Time.now
            super(*args, &block)
          end

          # @return [Time,nil]
          def last_used
            @last_used
          end

          # Attempts to close/finish the session without raising an error.
          def finish
            super
          rescue IOError
            nil
          end

        end
      end
    end
  end
end
