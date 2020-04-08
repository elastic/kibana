module Aws
  module Plugins

    # Makes it possible to conditional sign {Aws::CloudSearchDomain::Client}
    # requests. When credentials are configured, requests are signed.
    # When they are omitted, the request is sent anonymously.
    #
    # @seahorse.client.option [String] :sigv4_region Only needed when sending
    #   authenticated/signed requests to a Cloud Search domain and the
    #   endpoint does not contain the region name.
    #
    class CSDConditionalSigning < Seahorse::Client::Plugin

      # Adding region as an option to avoid an issue when `Aws.config[:region]`
      # is populated and the global configuration plugin merges options onto
      # this client.
      option(:region)

      option(:sigv4_region) do |cfg|
        # extract the region name from the cloud search domain endpoint
        if cfg.endpoint
          cfg.endpoint.to_s.split('.')[1]
        else
          raise ArgumentError, 'missing required option :endpoint'
        end
      end

    end
  end
end
