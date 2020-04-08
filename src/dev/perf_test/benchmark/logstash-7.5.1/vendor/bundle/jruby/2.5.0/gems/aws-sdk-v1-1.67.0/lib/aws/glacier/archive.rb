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

module AWS
  class Glacier

    class Archive < Resource

      # @param [Vault] vault
      # @param [String] archive_id
      # @param [Hash] options
      # @option options [String] :account_id
      def initialize vault, archive_id, options = {}
        @vault = vault
        @archive_id = archive_id
        super
      end

      # @return [Vault]
      attr_reader :vault

      # @return [String]
      attr_reader :archive_id

      alias_method :id, :archive_id

      # Deletes the current archive.
      # @return [nil]
      def delete
        client.delete_archive(resource_options)
        nil
      end

      protected

      def resource_identifiers
        [
          [:vault_name, vault.name],
          [:archive_id, archive_id],
          [:account_id, account_id],
        ]
      end

    end
  end
end
