require 'aws-sigv4'

module Aws
  module Polly

    # Allows you to create presigned URLs for `synthesize_speech`
    #
    # Example Use:
    #
    #   signer = Aws::Polly::Presigner.new
    #   url = signer.synthesize_speech_presigned_url(
    #     output_format: 'mp3',
    #     text: 'Hello World',
    #     voice_id: 'Ewa'
    #   )
    #
    class Presigner

      # @option options [required, Credentials] :credentials
      #   You need provide an object that responds to `#credentials`
      #   returning another object that responds to `#access_key_id`, `#secret_access_key`,
      #   and `#session_token`.
      #
      #   For example, you could provide an instance of following classes:
      #     * `Aws::Credentials`
      #     * `Aws::SharedCredentials`
      #     * `Aws::InstanceProfileCredentials`
      #     * `Aws::AssumeRoleCredentials`
      #     * `Aws::ECSCredentials`
      #
      # @option options [required, string] :region
      #   The region name, e.g. 'us-west-2'
      def initialize(options = {})
        @credentials = options.fetch(:credentials)
        @region = options.fetch(:region)
      end

      # @param [Hash] params parameter inputs for synthesize_speech operation
      def synthesize_speech_presigned_url(params = {})
        input_shape = Client.api.operation(:synthesize_speech).input.shape
        sign_but_dont_send(input_shape, params)
      end

      private

      def sign_but_dont_send(input_shape, params)
        parts = []
        input_shape.members.each do |name, ref|
          parts << [ ref, params[name] ] unless params[name].nil?
        end
        query = Aws::Rest::Request::QuerystringBuilder.new.build(parts)

        signer = Aws::Sigv4::Signer.new(
          service: 'polly',
          region: @region,
          credentials_provider: @credentials
        )
        url = Aws::EndpointProvider.resolve(signer.region, 'polly')
        url += "/v1/speech?#{query}"
        pre_signed_url = signer.presign_url(
          http_method: 'GET',
          url: url,
          body: '',
          expires_in: 900
        ).to_s
      end
    end

  end
end
