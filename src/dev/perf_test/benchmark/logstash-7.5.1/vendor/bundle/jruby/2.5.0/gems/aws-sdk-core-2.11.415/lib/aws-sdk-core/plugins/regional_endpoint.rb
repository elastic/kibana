module Aws
  module Plugins

    # @seahorse.client.option [required, String] :region
    #   The AWS region to connect to.  The region is used to construct
    #   the client endpoint.  Defaults to `ENV['AWS_REGION']`.
    #   Also checks `AMAZON_REGION` and `AWS_DEFAULT_REGION`.
    #
    # @seahorse.client.option [String] :endpoint A default endpoint is
    #   constructed from the `:region`.
    #
    class RegionalEndpoint < Seahorse::Client::Plugin

      # raised when region is not configured
      MISSING_REGION = 'missing required configuration option :region'

      option(:profile)

      option(:region) do |cfg|
        resolve_region(cfg)
      end

      option(:regional_endpoint, false)

      option(:endpoint) do |cfg|
        endpoint_prefix = cfg.api.metadata['endpointPrefix']
        if cfg.region && endpoint_prefix
          EndpointProvider.resolve(cfg.region, endpoint_prefix)
          sts_regional = cfg.respond_to?(:sts_regional_endpoints) ? cfg.sts_regional_endpoints : nil
          EndpointProvider.resolve(cfg.region, endpoint_prefix, sts_regional)
        end
      end

      def after_initialize(client)
        if client.config.region.nil? or client.config.region == ''
          msg = "missing region; use :region option or "
          msg << "export region name to ENV['AWS_REGION']"
          raise Errors::MissingRegionError, msg
        end
      end

      private

      def self.resolve_region(cfg)
        keys = %w(AWS_REGION AMAZON_REGION AWS_DEFAULT_REGION)
        env_region = ENV.values_at(*keys).compact.first
        env_region = nil if env_region == ''
        cfg_region = Aws.shared_config.region(profile: cfg.profile)
        env_region || cfg_region
      end

    end
  end
end
