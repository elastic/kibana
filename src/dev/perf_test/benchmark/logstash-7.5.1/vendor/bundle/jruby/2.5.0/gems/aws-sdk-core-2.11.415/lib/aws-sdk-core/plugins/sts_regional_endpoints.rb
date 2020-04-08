module Aws
  module Plugins

    class STSRegionalEndpoints < Seahorse::Client::Plugin

      option(:sts_regional_endpoints,
        default: 'legacy',
        doc_type: String,
        docstring: <<-DOCS) do |cfg|
Passing in 'regional' to enable regional endpoint for STS for all supported
regions (except 'aws-global'), defaults to 'legacy' mode, using global endpoint
for legacy regions.
      DOCS
        resolve_sts_regional_endpoints(cfg)
      end

      private
                                                                       
      def self.resolve_sts_regional_endpoints(cfg)
        env_mode = ENV['AWS_STS_REGIONAL_ENDPOINTS']
        env_mode = nil if env_mode == ''
        cfg_mode = Aws.shared_config.sts_regional_endpoints(
          profile: cfg.profile)
        env_mode || cfg_mode || 'legacy'
      end

    end

  end
end
