# encoding: ascii
# frozen_string_literal: true
require 'dalli'

module ActiveSupport
  module Cache
    class DalliStore

      attr_reader :silence, :options
      alias_method :silence?, :silence

      def self.supports_cache_versioning?
        true
      end

      # Silence the logger.
      def silence!
        @silence = true
        self
      end

      # Silence the logger within a block.
      def mute
        previous_silence, @silence = defined?(@silence) && @silence, true
        yield
      ensure
        @silence = previous_silence
      end

      ESCAPE_KEY_CHARS = /[\x00-\x20%\x7F-\xFF]/

      # Creates a new DalliStore object, with the given memcached server
      # addresses. Each address is either a host name, or a host-with-port string
      # in the form of "host_name:port". For example:
      #
      #   ActiveSupport::Cache::DalliStore.new("localhost", "server-downstairs.localnetwork:8229")
      #
      # If no addresses are specified, then DalliStore will connect to
      # localhost port 11211 (the default memcached port).
      #
      # Connection Pool support
      #
      # If you are using multithreaded Rails, the Rails.cache singleton can become a source
      # of contention.  You can use a connection pool of Dalli clients with Rails.cache by
      # passing :pool_size and/or :pool_timeout:
      #
      # config.cache_store = :dalli_store, 'localhost:11211', :pool_size => 10
      #
      # Both pool options default to 5.  You must include the `connection_pool` gem if you
      # wish to use pool support.
      #
      def initialize(*addresses)
        addresses = addresses.flatten
        options = addresses.extract_options!
        @options = options.dup

        pool_options = {}
        pool_options[:size] = options[:pool_size] if options[:pool_size]
        pool_options[:timeout] = options[:pool_timeout] if options[:pool_timeout]

        @options[:compress] ||= @options[:compression]

        addresses.compact!
        servers = if addresses.empty?
                    nil # use the default from Dalli::Client
                  else
                    addresses
                  end
        if pool_options.empty?
          @data = Dalli::Client.new(servers, @options)
        else
          @data = ::ConnectionPool.new(pool_options) { Dalli::Client.new(servers, @options.merge(:threadsafe => false)) }
        end

        extend Strategy::LocalCache
        extend LocalCacheEntryUnwrapAndRaw
      end

      ##
      # Access the underlying Dalli::Client or ConnectionPool instance for
      # access to get_multi, etc.
      def dalli
        @data
      end

      def with(&block)
        @data.with(&block)
      end

      # Fetch the value associated with the key.
      # If a value is found, then it is returned.
      #
      # If a value is not found and no block is given, then nil is returned.
      #
      # If a value is not found (or if the found value is nil and :cache_nils is false)
      # and a block is given, the block will be invoked and its return value
      # written to the cache and returned.
      def fetch(name, options=nil)
        options ||= {}
        options[:cache_nils] = true if @options[:cache_nils]
        namespaced_name = namespaced_key(name, options)
        not_found = options[:cache_nils] ? Dalli::Server::NOT_FOUND : nil
        if block_given?
          entry = not_found
          unless options[:force]
            entry = instrument_with_log(:read, namespaced_name, options) do |payload|
              read_entry(namespaced_name, options).tap do |result|
                if payload
                  payload[:super_operation] = :fetch
                  payload[:hit] = not_found != result
                end
              end
            end
          end

          if not_found == entry
            result = instrument_with_log(:generate, namespaced_name, options) do |payload|
              yield(name)
            end
            write(name, result, options)
            result
          else
            instrument_with_log(:fetch_hit, namespaced_name, options) { |payload| }
            entry
          end
        else
          read(name, options)
        end
      end

      def read(name, options=nil)
        options ||= {}
        name = namespaced_key(name, options)

        instrument_with_log(:read, name, options) do |payload|
          entry = read_entry(name, options)
          payload[:hit] = !entry.nil? if payload
          entry
        end
      end

      def write(name, value, options=nil)
        options ||= {}
        name = namespaced_key(name, options)

        instrument_with_log(:write, name, options) do |payload|
          with do |connection|
            options = options.merge(:connection => connection)
            write_entry(name, value, options)
          end
        end
      end

      def exist?(name, options=nil)
        options ||= {}
        name = namespaced_key(name, options)

        log(:exist, name, options)
        !read_entry(name, options).nil?
      end

      def delete(name, options=nil)
        options ||= {}
        name = namespaced_key(name, options)

        instrument_with_log(:delete, name, options) do |payload|
          delete_entry(name, options)
        end
      end

      # Reads multiple keys from the cache using a single call to the
      # servers for all keys. Keys must be Strings.
      def read_multi(*names)
        options  = names.extract_options!
        mapping = names.inject({}) { |memo, name| memo[namespaced_key(name, options)] = name; memo }
        instrument_with_log(:read_multi, mapping.keys) do
          results = {}
          if local_cache
            mapping.each_key do |key|
              if value = local_cache.read_entry(key, options)
                results[key] = value
              end
            end
          end

          data = with { |c| c.get_multi(mapping.keys - results.keys) }
          results.merge!(data)
          results.inject({}) do |memo, (inner, _)|
            entry = results[inner]
            # NB Backwards data compatibility, to be removed at some point
            value = (entry.is_a?(ActiveSupport::Cache::Entry) ? entry.value : entry)
            memo[mapping[inner]] = value
            local_cache.write_entry(inner, value, options) if local_cache
            memo
          end
        end
      end

      # Fetches data from the cache, using the given keys. If there is data in
      # the cache with the given keys, then that data is returned. Otherwise,
      # the supplied block is called for each key for which there was no data,
      # and the result will be written to the cache and returned.
      def fetch_multi(*names)
        options = names.extract_options!
        mapping = names.inject({}) { |memo, name| memo[namespaced_key(name, options)] = name; memo }

        instrument_with_log(:fetch_multi, mapping.keys) do
          with do |connection|
            results = connection.get_multi(mapping.keys)

            connection.multi do
              mapping.inject({}) do |memo, (expanded, name)|
                memo[name] = results[expanded]
                if memo[name].nil?
                  value = yield(name)
                  memo[name] = value
                  options = options.merge(:connection => connection)
                  write_entry(expanded, value, options)
                end

                memo
              end
            end
          end
        end
      end

      # Increment a cached value. This method uses the memcached incr atomic
      # operator and can only be used on values written with the :raw option.
      # Calling it on a value not stored with :raw will fail.
      # :initial defaults to the amount passed in, as if the counter was initially zero.
      # memcached counters cannot hold negative values.
      def increment(name, amount = 1, options=nil)
        options ||= {}
        name = namespaced_key(name, options)
        initial = options.has_key?(:initial) ? options[:initial] : amount
        expires_in = options[:expires_in]
        instrument_with_log(:increment, name, :amount => amount) do
          with { |c| c.incr(name, amount, expires_in, initial) }
        end
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        nil
      end

      # Decrement a cached value. This method uses the memcached decr atomic
      # operator and can only be used on values written with the :raw option.
      # Calling it on a value not stored with :raw will fail.
      # :initial defaults to zero, as if the counter was initially zero.
      # memcached counters cannot hold negative values.
      def decrement(name, amount = 1, options=nil)
        options ||= {}
        name = namespaced_key(name, options)
        initial = options.has_key?(:initial) ? options[:initial] : 0
        expires_in = options[:expires_in]
        instrument_with_log(:decrement, name, :amount => amount) do
          with { |c| c.decr(name, amount, expires_in, initial) }
        end
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        nil
      end

      # Clear the entire cache on all memcached servers. This method should
      # be used with care when using a shared cache.
      def clear(options=nil)
        instrument_with_log(:clear, 'flushing all keys') do
          with { |c| c.flush_all }
        end
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        nil
      end

      # Clear any local cache
      def cleanup(options=nil)
      end

      # Get the statistics from the memcached servers.
      def stats
        with { |c| c.stats }
      end

      def reset
        with { |c| c.reset }
      end

      def logger
        Dalli.logger
      end

      def logger=(new_logger)
        Dalli.logger = new_logger
      end

      protected

      # Read an entry from the cache.
      def read_entry(key, options) # :nodoc:
        entry = with { |c| c.get(key, options) }
        # NB Backwards data compatibility, to be removed at some point
        entry.is_a?(ActiveSupport::Cache::Entry) ? entry.value : entry
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        nil
      end

      # Write an entry to the cache.
      def write_entry(key, value, options) # :nodoc:
        # cleanup LocalCache
        cleanup if options[:unless_exist]
        method = options[:unless_exist] ? :add : :set
        expires_in = options[:expires_in]
        connection = options.delete(:connection)
        connection.send(method, key, value, expires_in, options)
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        false
      end

      # Delete an entry from the cache.
      def delete_entry(key, options) # :nodoc:
        with { |c| c.delete(key) }
      rescue Dalli::DalliError => e
        log_dalli_error(e)
        instrument_error(e) if instrument_errors?
        raise if raise_errors?
        false
      end

      private

      def namespaced_key(key, options)
        key = expanded_key(key)
        namespace = options[:namespace] if options
        prefix = namespace.is_a?(Proc) ? namespace.call : namespace
        key = "#{prefix}:#{key}" if prefix
        key = "#{key[0, 213]}:md5:#{::Digest::MD5.hexdigest(key)}" if key && key.size > 250
        key
      end
      alias :normalize_key :namespaced_key

      # Expand key to be a consistent string value. Invokes +cache_key_with_version+
      # first to support Rails 5.2 cache versioning.
      # Invoke +cache_key+ if object responds to +cache_key+. Otherwise, to_param method
      # will be called. If the key is a Hash, then keys will be sorted alphabetically.
      def expanded_key(key) # :nodoc:
        return key.cache_key_with_version.to_s if key.respond_to?(:cache_key_with_version)
        return key.cache_key.to_s if key.respond_to?(:cache_key)

        case key
        when Array
          if key.size > 1
            key = key.collect{|element| expanded_key(element)}
          else
            key = key.first
          end
        when Hash
          key = key.sort_by { |k,_| k.to_s }.collect{|k,v| "#{k}=#{v}"}
        end

        key = key.to_param
        if key.respond_to? :force_encoding
          key = key.dup
          key.force_encoding('binary')
        end
        key
      end

      def log_dalli_error(error)
        logger.error("DalliError: #{error.message}") if logger
      end

      def instrument_with_log(operation, key, options=nil)
        log(operation, key, options)

        payload = { :key => key }
        payload.merge!(options) if options.is_a?(Hash)
        instrument(operation, payload) { |p| yield(p) }
      end

      def instrument_error(error)
        instrument(:error, { :key => 'DalliError', :message => error.message })
      end

      def instrument(operation, payload)
        ActiveSupport::Notifications.instrument("cache_#{operation}.active_support", payload) do
          yield(payload) if block_given?
        end
      end

      def log(operation, key, options=nil)
        return unless logger && logger.debug? && !silence?
        logger.debug("Cache #{operation}: #{key}#{options.blank? ? "" : " (#{options.inspect})"}")
      end

      def raise_errors?
        !!@options[:raise_errors]
      end

      def instrument_errors?
        !!@options[:instrument_errors]
      end

      # Make sure LocalCache is giving raw values, not `Entry`s, and
      # respect `raw` option.
      module LocalCacheEntryUnwrapAndRaw # :nodoc:
        protected
          def read_entry(key, options)
            retval = super
            if retval.is_a? ActiveSupport::Cache::Entry
              # Must have come from LocalStore, unwrap it
              if options[:raw]
                retval.value.to_s
              else
                retval.value
              end
            else
              retval
            end
          end
      end
    end
  end
end
