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
  class Glacier

    class ArchiveCollection

      include Core::Model

      # @param [Vault] vault
      # @param [Hash] options
      # @option options [String] :account_id
      def initialize vault, options = {}
        @vault = vault
        @account_id = options[:account_id] || '-'
        super
      end

      # @return [Vault]
      attr_reader :vault

      # @return [String]
      attr_reader :account_id

      # Creates an archive by uploading a file to a vault.
      # @param [File,Pathname,IO,String] data The data to upload.
      #   If `data` is a string, this is treated as a path to a file
      #   on disk.
      # @param [Hash] options
      # @option options [String] description
      # @return [Archive]
      def create data, options = {}

        data = convert_to_io(data)

        hash, tree_hash = compute_checksums(data)

        upload_options = {}
        upload_options[:vault_name] = vault.name
        upload_options[:account_id] = account_id
        upload_options[:body] = data
        upload_options[:checksum] = tree_hash
        upload_options[:content_sha256] = hash
        upload_options[:archive_description] = options[:description] if
          options[:description]

        resp = client.upload_archive(upload_options)

        self[resp[:archive_id]]

      end

      # @param [String] archive_id
      # @return [Archive]
      def [] archive_id
        Archive.new(vault, archive_id, :config => config, :account_id => account_id)
      end

      protected

      def convert_to_io data
        return Core::ManagedFile.open(data) if
          data.is_a?(Pathname) or data.is_a?(String)

        return data if io_like?(data)

        msg = "expected data to be IO-like or a file path (String/Pathanme)."
        raise ArgumentError, msg
      end

      # @return [Boolean] Returns `tue` if data acts like a file.
      def io_like? data
        data.respond_to?(:read) and
        data.respond_to?(:eof?) and
        data.respond_to?(:rewind) and
        data.respond_to?(:size)
      end

      # Computes two checksums in a single pass of the data:
      # * a hash of the entire payload
      # * a tree hash of the entire payload
      #
      # The tree hash is required by the streaming operations,
      # the simple hash is required for generating the signature
      # (via sigv4).
      #
      # The sigv4 module will compute the hash of the payload for us,
      # but that requires reading the data a 2nd time. :(
      def compute_checksums data

        digest = OpenSSL::Digest.new('sha256')
        tree_digest = OpenSSL::Digest.new('sha256')
        tree_parts = []

        until data.eof?

          chunk = data.read(1024 * 1024) # read 1MB
          tree_parts << tree_digest.update(chunk).digest
          tree_digest.reset

          digest.update(chunk)

        end

        data.rewind

        [digest.to_s, compute_tree_hash(tree_parts)]

      end

      def compute_tree_hash hashes

        digest = OpenSSL::Digest.new('sha256')

        until hashes.count == 1
          hashes = hashes.each_slice(2).map do |h1,h2|
            digest.reset
            if h2
              digest.update(h1)
              digest.update(h2)
              digest.digest
            else
              h1
            end
          end
        end

        hashes.first.bytes.map{|x| x.to_i.to_s(16).rjust(2,'0')}.join('')
      end

    end
  end
end
