require 'pathname'
require 'set'

module Aws
  module Log
    class ParamFilter

      # A managed list of sensitive parameters that should be filtered from
      # logs. This is updated automatically as part of each release. See the
      # `tasks/sensitive.rake` for more information.
      #
      # ** DO NOT EDIT THE FOLLOWING LINE OF CODE **
      #
      SENSITIVE = [:access_token, :admin_contact, :artifact_credentials, :auth_code, :base_32_string_seed, :client_id, :client_secret, :copy_source_sse_customer_key, :id_token, :local_console_password, :new_password, :old_password, :password, :plaintext, :previous_password, :private_key, :proposed_password, :public_key, :qr_code_png, :refresh_token, :registrant_contact, :secret_access_key, :secret_hash, :shared_secret, :sse_customer_key, :ssekms_key_id, :tech_contact, :trust_password, :upload_credentials, :username, :value]

      def initialize(options = {})
        @filters = Set.new(SENSITIVE + Array(options[:filter]))
      end

      def filter(value)
        case value
        when Struct, Hash then filter_hash(value)
        when Array then filter_array(value)
        else value
        end
      end

      private

      def filter_hash(values)
        filtered = {}
        values.each_pair do |key, value|
          filtered[key] = @filters.include?(key) ? '[FILTERED]' : filter(value)
        end
        filtered
      end

      def filter_array(values)
        values.map { |value| filter(value) }
      end

    end
  end
end
