# frozen-string-literal: true

module Sequel
  module Plugins
    # Sequel's built-in caching plugin supports caching to any object that
    # implements the Ruby-Memcache API (or memcached API with the :ignore_exceptions
    # option):
    #
    #    cache_store.set(key, obj, time) # Associate the obj with the given key
    #                                    # in the cache for the time (specified
    #                                    # in seconds).
    #    cache_store.get(key) # => obj   # Returns object set with same key.
    #    cache_store.get(key2) # => nil  # nil returned if there isn't an object
    #                                    # currently in the cache with that key.
    #    cache_store.delete(key)         # Remove key from cache
    #
    # If the :ignore_exceptions option is true, exceptions raised by cache_store.get
    # are ignored and nil is returned instead.  The memcached API is to
    # raise an exception for a missing record, so if you use memcached, you will
    # want to use this option.
    #
    # Note that only lookups by primary key are cached using this plugin.  The following
    # methods use a lookup by primary key:
    #
    # * Model.with_pk
    # * Model.with_pk!
    # * Model.[] # when argument is not hash or nil
    # * many_to_one association method # without dynamic callback, when primary key matches
    #
    # You should not use this plugin if you are using sharding and there are different
    # rows for the same primary key on different shards.
    # 
    # Usage:
    #
    #   # Make all subclasses use the same cache (called before loading subclasses)
    #   # using the Ruby-Memcache API, with the cache stored in the CACHE constant
    #   Sequel::Model.plugin :caching, CACHE
    #
    #   # Make the Album class use the cache with a 30 minute time-to-live
    #   Album.plugin :caching, CACHE, ttl: 1800
    #
    #   # Make the Artist class use a cache with the memcached protocol
    #   Artist.plugin :caching, MEMCACHED_CACHE, ignore_exceptions: true
    module Caching
      # Set the cache_store and cache_ttl attributes for the given model.
      # If the :ttl option is not given, 3600 seconds is the default.
      def self.configure(model, store, opts=OPTS)
        model.instance_exec do
          @cache_store = store
          @cache_ttl = opts[:ttl] || 3600
          @cache_ignore_exceptions = opts[:ignore_exceptions]
        end
      end

      module ClassMethods
        # If true, ignores exceptions when gettings cached records (the memcached API).
        attr_reader :cache_ignore_exceptions
        
        # The cache store object for the model, which should implement the
        # Ruby-Memcache (or memcached) API
        attr_reader :cache_store
        
        # The time to live for the cache store, in seconds.
        attr_reader :cache_ttl

        # Delete the cached object with the given primary key.
        def cache_delete_pk(pk)
          cache_delete(cache_key(pk))
        end

        # Return the cached object with the given primary key,
        # or nil if no such object is in the cache.
        def cache_get_pk(pk)
          cache_get(cache_key(pk))
        end

        # Returns the prefix used to namespace this class in the cache.
        def cache_key_prefix
          to_s
        end

        # Return a key string for the given primary key.
        def cache_key(pk)
          raise(Error, 'no primary key for this record') unless pk.is_a?(Array) ? pk.all? : pk
          "#{cache_key_prefix}:#{Array(pk).join(',')}"
        end
        
        Plugins.inherited_instance_variables(self, :@cache_store=>nil, :@cache_ttl=>nil, :@cache_ignore_exceptions=>nil)

        # Set the time to live for the cache store, in seconds (default is 3600, # so 1 hour).
        def set_cache_ttl(ttl)
          @cache_ttl = ttl
        end
        
        private
    
        # Access the cache using the given method and key, rescuing exceptions if necessary.
        def cache_op(meth, ck)
          if @cache_ignore_exceptions
            @cache_store.public_send(meth, ck) rescue nil
          else
            @cache_store.public_send(meth, ck)
          end
        end
    
        # Delete the entry with the matching key from the cache
        def cache_delete(ck)
          cache_op(:delete, ck)
          nil
        end
        
        # Returned the cached object, or nil if the object was not
        # in the cached
        def cache_get(ck)
          cache_op(:get, ck)
        end

        # Set the object in the cache_store with the given key for cache_ttl seconds.
        def cache_set(ck, obj)
          @cache_store.set(ck, obj, @cache_ttl)
        end
        
        # Check the cache before a database lookup unless a hash is supplied.
        def primary_key_lookup(pk)
          ck = cache_key(pk)
          unless obj = cache_get(ck)
            if obj = super(pk)
              cache_set(ck, obj)
            end
          end 
          obj
        end
      end

      module InstanceMethods
        # Remove the object from the cache when updating
        def before_update
          cache_delete
          super
        end

        # Return a key unique to the underlying record for caching, based on the
        # primary key value(s) for the object.  If the model does not have a primary
        # key, raise an Error.
        def cache_key
          model.cache_key(pk)
        end
    
        # Remove the object from the cache when deleting
        def delete
          cache_delete
          super
        end

        private
    
        # Delete this object from the cache
        def cache_delete
          model.cache_delete_pk(pk)
        end
      end
    end
  end
end
