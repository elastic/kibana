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

    class VaultCollection

      include Core::Collection::WithLimitAndNextToken

      # @param [Hash] options
      # @option options [String] :account_id
      def initialize options = {}
        @account_id = options[:account_id] || '-'
        super
      end

      # @return [String]
      attr_reader :account_id

      # @param [String] name
      def create name

        options = {}
        options[:vault_name] = name
        options[:account_id] = account_id
        client.create_vault(options)

        self[name]

      end

      # @param [String] name The name of the vault.
      # @return [Vault] Returns a vault with the given name.
      def [] name
        Vault.new(name, :config => config, :account_id => account_id)
      end

      protected

      def _each_item next_token, limit, options, &block

        options[:limit] = limit if limit
        options[:marker] = next_token if next_token
        options[:account_id] = account_id

        resp = client.list_vaults(options)
        resp[:vault_list].each do |v|

          vault = Vault.new_from(:list_vaults, v,
            v[:vault_name],
            :config => config,
            :account_id => account_id)

          yield(vault)

        end

        resp[:marker]

      end

    end
  end
end
