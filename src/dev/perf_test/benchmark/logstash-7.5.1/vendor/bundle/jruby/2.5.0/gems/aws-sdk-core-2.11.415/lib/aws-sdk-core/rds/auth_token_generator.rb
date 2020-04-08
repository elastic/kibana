require 'aws-sigv4'

module Aws
  module RDS

    # The utility class helps generate an auth token that supports database login
    # It provides a method:
    #
    # * {#auth_token} - Computes a login token which is similar to
    #   a presigned url
    class AuthTokenGenerator

      # @option options [required, Credentials] :credentials
      # You need provide an object that responds to `#credentials`
      # returning another object that responds to `#access_key_id`, `#secret_access_key`,
      # and `#session_token`.
      #
      # For example, you could provide an instance of following classes:
      # * `Aws::Credentials`
      # * `Aws::SharedCredentials`
      # * `Aws::InstanceProfileCredentials`
      # * `Aws::AssumeRoleCredentials`
      # * `Aws::ECSCredentials`
      def initialize(options = {})
        @credentials = options.fetch(:credentials)
      end

      # To create a auth login token, following parameters are required:
      #
      # @params [required, String] :region Region the databaseis located in
      # @params [required, String] :endpoint Hostname of the database with port number
      #   For example: my-instance.us-west-2.rds.amazonaws.com:3306
      # @params [required, String] :user_name Username to login as
      #
      # @return [String]
      def auth_token(params)
        region = params.fetch(:region)
        endpoint = params.fetch(:endpoint)
        user_name = params.fetch(:user_name)

        param_list = Aws::Query::ParamList.new
        param_list.set('Action', 'connect')
        param_list.set('DBUser', user_name)

        signer = Aws::Sigv4::Signer.new(
          service: 'rds-db',
          region: region,
          credentials_provider: @credentials
        )
        url = "https://" + endpoint + "/?#{param_list.to_s}"
        presigned_url = signer.presign_url(
          http_method: 'GET',
          url: url,
          body: '',
          expires_in: 900
        ).to_s
        # Remove extra scheme for token
        presigned_url[8..-1]
      end

    end
  end
end
