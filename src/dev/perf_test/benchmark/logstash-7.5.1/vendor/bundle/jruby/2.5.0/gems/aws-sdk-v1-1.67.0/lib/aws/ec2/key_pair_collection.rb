# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

require 'base64'
require 'digest/md5'

module AWS
  class EC2

    # Represents all key pairs in your account.  You can use this collection
    # to create, import and find key pairs.
    class KeyPairCollection < Collection

      # @param [String] key_name A name for the key pair.
      # @return [KeyPair] Returns a new key pair.
      def create key_name
        create_or_import(:create_key_pair, :key_name => key_name)
      end

      # Imports the public key from an RSA key pair that you created with
      # a third-party tool. Compare this with {#create}, in which EC2
      # creates the key pair and gives the keys to you (EC2 keeps a copy
      # of the public key). With ImportKeyPair, you create the key pair
      # and give EC2 just the public key. The private key is never
      # transferred between you and EC2.
      #
      # ### Supported formats:
      #
      # * OpenSSH public key format (e.g., the format in
      #   ~/.ssh/authorized_keys)
      # * Base64 encoded DER format
      # * SSH public key file format as specified in RFC4716
      #
      # DSA keys are *not* supported. Make sure your key generator is
      # set up to create RSA keys. Supported lengths: 1024, 2048, and 4096.
      #
      # @param [String] key_name A name for this key pair.
      # @param [String] public_key The RSA public key.
      # @return [KeyPair] Returns a new key pair.
      def import key_name, public_key
        create_or_import(:import_key_pair,
          :key_name => key_name,
          :public_key_material => Base64.encode64(public_key.to_s))
      end

      # @return [KeyPair] key_name The name of the key pair.
      def [] key_name
        super
      end

      # Yields once for each key pair in your account.
      # @return [nil]
      def each &block
        response = filtered_request(:describe_key_pairs)
        response.key_set.each do |kp|
          yield(KeyPair.new(kp.key_name,
                            :fingerprint => kp.key_fingerprint,
                            :config => config))
        end
        nil
      end

      # @api private
      protected
      def member_class
        KeyPair
      end

      # @api private
      private
      def create_or_import client_method, options

        # stringify option values
        options = options.inject({}) {|h,v| h[v.first] = v.last.to_s; h }
        response = client.send(client_method, options)

        options = {}
        options[:fingerprint] = response.data[:key_fingerprint]
        if response[:key_material]
          options[:private_key] = response.data[:key_material]
        end

        KeyPair.new(response.key_name, options.merge(:config => config))

      end

    end
  end
end
