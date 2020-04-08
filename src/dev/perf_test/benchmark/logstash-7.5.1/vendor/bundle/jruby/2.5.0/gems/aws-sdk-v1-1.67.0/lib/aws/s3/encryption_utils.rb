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

require 'openssl'

module AWS
  class S3
    # @api private
    module EncryptionUtils

      protected

      UNSAFE_MSG = "Unsafe encryption, data is longer than key length"

      # @param [OpenSSL::PKey::RSA, String] key Key used to encrypt.
      #
      # @param [String] data Data to be encrypted.
      #
      # @note Use check_encryption_materials before this method to check
      #   formatting of keys.
      # @note This should not be used for data longer than the key length as
      #   it will not be cryptographically safe.
      #
      # @return [String] Returns the data encrypted with the key given.
      def encrypt data, key
        rsa = OpenSSL::PKey::RSA
        data_cipher_size = get_cipher_size(data.length)

        # Encrypting data key
        case key
        when rsa # Asymmetric encryption
          warn UNSAFE_MSG if key.public_key.n.num_bits < data_cipher_size
          key.public_encrypt(data)
        when String             # Symmetric encryption
          warn UNSAFE_MSG if get_cipher_size(key.length) < data_cipher_size
          cipher = get_aes_cipher(:encrypt, :ECB, key)
          cipher.update(data) + cipher.final
        end
      end

      # @param [OpenSSL::PKey::RSA, String] key Key used to encrypt.
      #
      # @param [String] data Data to be encrypted.
      #
      # @note Use check_encryption_materials before this method to check
      #   formatting of keys
      #
      # @return [String] Returns the data decrypted with the key given.
      def decrypt data, key
        rsa = OpenSSL::PKey::RSA
        begin
          case key
          when rsa # Asymmetric Decryption
              key.private_decrypt(data)
          when String             # Symmetric Decryption
              cipher = get_aes_cipher(:decrypt, :ECB, key)
              cipher.update(data) + cipher.final
          end
        rescue OpenSSL::Cipher::CipherError
          raise RuntimeError, "decryption failed, incorrect key?"
        end
      end

      # Checks for any formatting problems for keys and initialization vectors
      #   supported with EncryptionUtils.
      def check_encryption_materials mode, key
        rsa = OpenSSL::PKey::RSA
        case key
        when rsa
          unless key.private? or mode == :encrypt
            msg = "invalid key, #{rsa} requires a private key"
            raise ArgumentError, msg
          end
        when String # no problem
        else
          msg = "invalid key, must be an #{rsa} or a cipher key string"
          raise ArgumentError, msg
        end
      end

      # @param [OpenSSL::Cipher] cipher The cipher with configured key and iv.
      #
      # @yield [String, String] key_iv_pair A randomly generated key, iv pair
      #   for use with the given cipher.  Sets the key and iv on the cipher.
      def generate_aes_key cipher, &block
        key_iv_pair = [cipher.random_key, cipher.random_iv]
        yield(key_iv_pair) if block_given?
      end

      # @param [Symbol] mode The encryption/decryption mode.  Valid inputs are
      #   :encrypt or :decrypt
      #
      # @param [String] key Key for the cipher.
      #
      # @param [String] iv IV for the cipher.
      #
      # @return [OpenSSL::Cipher] Will return a configured `OpenSSL::Cipher`.
      def get_aes_cipher mode, block_mode, key = nil, iv = nil

        # If no key given, default to 256 bit
        cipher_size = (key) ? get_cipher_size(key.length) : 256

        cipher = OpenSSL::Cipher.new("AES-#{cipher_size}-#{block_mode}")

        (mode == :encrypt) ? cipher.encrypt : cipher.decrypt
        cipher.key = key if key
        cipher.iv  = iv  if iv
        cipher
      end

      # @param  [Integer] size Size of data given.
      # @return [Integer] Returns the AES encrypted size based on a given size.
      def get_encrypted_size size
        # The next multiple of 16
        ((size / 16) + 1) * 16
      end
      module_function :get_encrypted_size

      private

      # @param  [Fixnum] key_length Length of the key given.
      # @return [Fixnum] Returns the cipher size based on the key length.
      def get_cipher_size(key_length)
        case key_length
        when 32 then 256
        when 24 then 192
        when 16 then 128
        else
          msg = "invalid key, symmetric key required to be 16, 24, or 32 bytes "
          msg << "in length, saw length #{key_length}"
          raise ArgumentError, msg
        end
      end
    end
  end
end
