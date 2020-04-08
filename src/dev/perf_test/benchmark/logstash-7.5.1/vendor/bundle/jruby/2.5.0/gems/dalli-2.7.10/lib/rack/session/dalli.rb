# frozen_string_literal: true
require 'rack/session/abstract/id'
require 'dalli'

module Rack
  module Session
    class Dalli < defined?(Abstract::Persisted) ? Abstract::Persisted : Abstract::ID
      attr_reader :pool, :mutex

      DEFAULT_DALLI_OPTIONS = {
        :namespace => 'rack:session',
        :memcache_server => 'localhost:11211'
      }

      # Brings in a new Rack::Session::Dalli middleware with the given
      # `:memcache_server`. The server is either a hostname, or a
      # host-with-port string in the form of "host_name:port", or an array of
      # such strings. For example:
      #
      #   use Rack::Session::Dalli,
      #     :memcache_server => "mc.example.com:1234"
      #
      # If no `:memcache_server` option is specified, Rack::Session::Dalli will
      # connect to localhost, port 11211 (the default memcached port). If
      # `:memcache_server` is set to nil, Dalli::Client will look for
      # ENV['MEMCACHE_SERVERS'] and use that value if it is available, or fall
      # back to the same default behavior described above.
      #
      # Rack::Session::Dalli is intended to be a drop-in replacement for
      # Rack::Session::Memcache. It accepts additional options that control the
      # behavior of Rack::Session, Dalli::Client, and an optional
      # ConnectionPool. First and foremost, if you wish to instantiate your own
      # Dalli::Client (or ConnectionPool) and use that instead of letting
      # Rack::Session::Dalli instantiate it on your behalf, simply pass it in
      # as the `:cache` option. Please note that you will be responsible for
      # setting the namespace and any other options on Dalli::Client.
      #
      # Secondly, if you're not using the `:cache` option, Rack::Session::Dalli
      # accepts the same options as Dalli::Client, so it's worth reviewing its
      # documentation. Perhaps most importantly, if you don't specify a
      # `:namespace` option, Rack::Session::Dalli will default to using
      # "rack:session".
      #
      # Whether you are using the `:cache` option or not, it is not recommend
      # to set `:expires_in`. Instead, use `:expire_after`, which will control
      # both the expiration of the client cookie as well as the expiration of
      # the corresponding entry in memcached.
      #
      # Rack::Session::Dalli also accepts a host of options that control how
      # the sessions and session cookies are managed, including the
      # aforementioned `:expire_after` option. Please see the documentation for
      # Rack::Session::Abstract::Persisted for a detailed explanation of these
      # options and their default values.
      #
      # Finally, if your web application is multithreaded, the
      # Rack::Session::Dalli middleware can become a source of contention. You
      # can use a connection pool of Dalli clients by passing in the
      # `:pool_size` and/or `:pool_timeout` options. For example:
      #
      #   use Rack::Session::Dalli,
      #     :memcache_server => "mc.example.com:1234",
      #     :pool_size => 10
      #
      # You must include the `connection_pool` gem in your project if you wish
      # to use pool support. Please see the documentation for ConnectionPool
      # for more information about it and its default options (which would only
      # be applicable if you supplied one of the two options, but not both).
      #
      def initialize(app, options={})
        # Parent uses DEFAULT_OPTIONS to build @default_options for Rack::Session
        super

        # Determine the default TTL for newly-created sessions
        @default_ttl = ttl @default_options[:expire_after]

        # Normalize and validate passed options
        cache, mserv, mopts, popts = extract_dalli_options options

        @pool =
          if cache # caller passed a Dalli::Client or ConnectionPool instance
            cache
          elsif popts # caller passed ConnectionPool options
            ConnectionPool.new(popts) { ::Dalli::Client.new(mserv, mopts) }
          else
            ::Dalli::Client.new(mserv, mopts)
          end

        if @pool.respond_to?(:alive!) # is a Dalli::Client
          @mutex = Mutex.new

          @pool.alive!
        end
      end

      def get_session(env, sid)
        with_block(env, [nil, {}]) do |dc|
          unless sid and !sid.empty? and session = dc.get(sid)
            old_sid, sid, session = sid, generate_sid_with(dc), {}
            unless dc.add(sid, session, @default_ttl)
              sid = old_sid
              redo # generate a new sid and try again
            end
          end
          [sid, session]
        end
      end

      def set_session(env, session_id, new_session, options)
        return false unless session_id

        with_block(env, false) do |dc|
          dc.set(session_id, new_session, ttl(options[:expire_after]))
          session_id
        end
      end

      def destroy_session(env, session_id, options)
        with_block(env) do |dc|
          dc.delete(session_id)
          generate_sid_with(dc) unless options[:drop]
        end
      end

      if defined?(Abstract::Persisted)
        def find_session(req, sid)
          get_session req.env, sid
        end

        def write_session(req, sid, session, options)
          set_session req.env, sid, session, options
        end

        def delete_session(req, sid, options)
          destroy_session req.env, sid, options
        end
      end

      private

      def extract_dalli_options(options)
        return [options[:cache]] if options[:cache]

        # Filter out Rack::Session-specific options and apply our defaults
        mopts = DEFAULT_DALLI_OPTIONS.merge \
          options.reject {|k, _| DEFAULT_OPTIONS.key? k }
        mserv = mopts.delete :memcache_server

        if mopts[:pool_size] || mopts[:pool_timeout]
          popts = {}
          popts[:size] = mopts.delete :pool_size if mopts[:pool_size]
          popts[:timeout] = mopts.delete :pool_timeout if mopts[:pool_timeout]

          # For a connection pool, locking is handled at the pool level
          mopts[:threadsafe] = false unless mopts.key? :threadsafe
        end

        [nil, mserv, mopts, popts]
      end

      def generate_sid_with(dc)
        while true
          sid = generate_sid
          break sid unless dc.get(sid)
        end
      end

      def with_block(env, default=nil, &block)
        @mutex.lock if @mutex and env['rack.multithread']
        @pool.with(&block)
      rescue ::Dalli::DalliError, Errno::ECONNREFUSED
        raise if $!.message =~ /undefined class/
        if $VERBOSE
          warn "#{self} is unable to find memcached server."
          warn $!.inspect
        end
        default
      ensure
        @mutex.unlock if @mutex and @mutex.locked?
      end

      def ttl(expire_after)
        expire_after.nil? ? 0 : expire_after + 1
      end
    end
  end
end
