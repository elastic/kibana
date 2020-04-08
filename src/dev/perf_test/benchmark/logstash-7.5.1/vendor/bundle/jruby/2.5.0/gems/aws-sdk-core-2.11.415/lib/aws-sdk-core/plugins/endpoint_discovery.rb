module Aws
  module Plugins

    # Enables Endpoint Discovery per service when supported
    #
    # @seahorse.client.option [Boolean] :endpoint_discovery When
    #     set to `true`, endpoint discovery will be enabled for
    #     operations when available. Defaults to `false`.
    #
    # @seahorse.client.option [Integer] :endpoint_cache_max_entries
    #   Used for the maximum size limit of the LRU cache storing endpoints data
    #   for endpoint discovery enabled operations. Defaults to 1000.
    #
    # @seahorse.client.option [Integer] :endpoint_cache_max_threads
    #   Used for the maximum threads in use for polling endpoints to be cached,
    #   defaults to 10.
    #
    # @seahorse.client.option [Integer] :endpoint_cache_poll_interval
    #   When :endpoint_discovery and :active_endpoint_cache is enabled,
    #   Use this option to config the time interval in seconds for making
    #   requests fetching endpoints information. Defaults to 60 sec.
    #
    # @seahorse.client.option [Boolean] :active_endpoint_cache
    #   When set to `true`, a thread polling for endpoints will be running in
    #   the background every 60 secs (default). Defaults to `false`.
    class EndpointDiscovery < Seahorse::Client::Plugin

      option(:endpoint_discovery, false) do |cfg|
        resolve_endpoint_discovery(cfg)
      end

      option(:endpoint_cache_max_entries, 1000)

      option(:endpoint_cache_max_threads, 10)

      option(:endpoint_cache_poll_interval, 60)

      option(:endpoint_cache) do |cfg|
        Aws::EndpointCache.new(
          max_entries: cfg.endpoint_cache_max_entries,
          max_threads: cfg.endpoint_cache_max_threads
        )
      end

      option(:active_endpoint_cache, false)

      def add_handlers(handlers, config)
        handlers.add(Handler, priority: 90) if config.regional_endpoint
      end

      class Handler < Seahorse::Client::Handler

        def call(context)
          if context.operation.endpoint_operation
            context.http_request.headers['x-amz-api-version'] = context.config.api.version
            _apply_endpoint_discovery_user_agent(context)
          elsif discovery_cfg = context.operation.endpoint_discovery
            endpoint = _discover_endpoint(
              context,
              str_2_bool(discovery_cfg["required"])
            )
            context.http_request.endpoint = _valid_uri(endpoint.address) if endpoint
            if endpoint || context.config.endpoint_discovery
              _apply_endpoint_discovery_user_agent(context)
            end
          end
          @handler.call(context)
        end

        private

        def _valid_uri(address)
          # returned address can be missing scheme
          if address.start_with?('http')
            URI.parse(address)
          else
            URI.parse("https://" + address)
          end
        end

        def _apply_endpoint_discovery_user_agent(ctx)
          if ctx.config.user_agent_suffix.nil?
            ctx.config.user_agent_suffix = "endpoint-discovery"
          elsif !ctx.config.user_agent_suffix.include? "endpoint-discovery"
            ctx.config.user_agent_suffix += "endpoint-discovery"
          end
        end

        def _discover_endpoint(ctx, required)
          cache = ctx.config.endpoint_cache 
          key = cache.extract_key(ctx)

          if required
            # required for the operation
            unless cache.key?(key)
              cache.update(key, ctx)
            end
            endpoint = cache[key]
            # hard fail if endpoint is not discovered
            raise Aws::Errors::EndpointDiscoveryError.new unless endpoint
            endpoint
          elsif ctx.config.endpoint_discovery
            # not required for the operation
            # but enabled
            if cache.key?(key)
              cache[key]
            elsif ctx.config.active_endpoint_cache
              # enabled active cache pull
              interval = ctx.config.endpoint_cache_poll_interval
              if key.include?('_')
                # identifier related, kill the previous polling thread by key
                # because endpoint req params might be changed
                cache.delete_polling_thread(key)
              end

              # start a thread for polling endpoints when non-exist
              unless cache.threads_key?(key)
                thread = Thread.new do
                  while !cache.key?(key) do
                    cache.update(key, ctx)
                    sleep(interval)
                  end
                end
                cache.update_polling_pool(key, thread)
              end

              cache[key]
            else
              # disabled active cache pull
              # attempt, buit fail soft
              cache.update(key, ctx)
              cache[key]
            end
          end
        end

        def str_2_bool(str)
          case str.to_s
          when "true" then true
          when "false" then false
          else
            nil
          end
        end

      end

      private

      def self.resolve_endpoint_discovery(cfg)
        env = ENV['AWS_ENABLE_ENDPOINT_DISCOVERY']
        shared_cfg = Aws.shared_config.endpoint_discovery(profile: cfg.profile)
        self.str_2_bool(env) || self.str_2_bool(shared_cfg)
      end

      def self.str_2_bool(str)
        case str.to_s
        when "true" then true
        when "false" then false
        else
          nil
        end
      end

    end
  end
end
