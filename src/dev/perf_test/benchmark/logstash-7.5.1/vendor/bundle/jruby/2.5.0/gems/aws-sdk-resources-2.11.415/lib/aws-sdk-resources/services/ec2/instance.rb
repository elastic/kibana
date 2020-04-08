require 'openssl'

module Aws
  module EC2
    class Instance

      # @param [String, Pathname] key_pair_path
      # @return [String]
      def decrypt_windows_password(key_pair_path)
        decoded = Base64.decode64(encrypted_password)
        pem_bytes = File.open(key_pair_path, 'rb') { |f| f.read }
        private_key = OpenSSL::PKey::RSA.new(pem_bytes)
        private_key.private_decrypt(decoded)
      end

      private

      def encrypted_password
        bytes = client.get_password_data(instance_id: id).password_data
        if bytes == ''
          raise 'password not available yet'
        else
          bytes
        end
      end

    end
  end
end
