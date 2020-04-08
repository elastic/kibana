require 'aws-sigv4'

module Aws
  module Plugins

    # This plugin auto populates the following request params for the
    # CopySnapshot API:
    #
    # * `:destination_region`
    # * `:presigned_url`
    #
    # These params are required by EC2 when copying an encrypted snapshot.
    class EC2CopyEncryptedSnapshot < Seahorse::Client::Plugin

      # @api private
      class Handler < Seahorse::Client::Handler

        def call(context)
          params = context.params
          params[:destination_region] = context.config.region
          params[:presigned_url] = presigned_url(context, params)
          @handler.call(context)
        end

        private

        def presigned_url(context, params)
          param_list = Aws::Query::ParamList.new
          param_list.set('Action', 'CopySnapshot')
          param_list.set('DestinationRegion', context.config.region)
          param_list.set('Version', context.config.api.metadata['apiVersion'])
          Aws::Query::EC2ParamBuilder.new(param_list).apply(context.operation.input, params)

          signer = Aws::Sigv4::Signer.new(
            service: 'ec2',
            region: params[:source_region],
            credentials_provider: context.config.credentials
          )
          url = Aws::EndpointProvider.resolve(signer.region, 'ec2')
          url += "?#{param_list.to_s}"

          signer.presign_url(
            http_method: 'GET',
            url: url,
            body: '',
            expires_in: 3600
          ).to_s
        end

      end

      handler(Handler, step: :initialize, operations: [:copy_snapshot])

    end
  end
end
