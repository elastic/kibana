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
  class IAM

    # @api private
    #
    # Currently IAM exposes the account alias in a collection, as if you
    # could create/manage multiple aliases for a single account.  However,
    # creating a 2nd alias replaces the first, it does not add an additional
    # alias.
    #
    # Because the API is modeled as a collection this class could be used
    # to work with it, but instead we consume this by the IAM class for
    # the following methods:
    #
    #   * create_account_alias
    #   * account_alias
    #   * remove_account_alias
    #
    # If IAM allows accounts to have multiple aliases, then those previous
    # 3 methods will be deprecated and this interface will be exposed.
    class AccountAliasCollection

      include Collection

      # Creates an AWS account alias.
      #
      #     iam.account_aliases.create('myaccountalias')
      #
      # For information about account alias restrictions and usage,
      # see http://docs.aws.amazon.com/IAM/latest/UserGuide/index.html?AccountAlias.html.
      #
      # @param [String] account_alias
      # @return [String] Returns the account_alias string that was passed.
      def create account_alias
        client.create_account_alias(:account_alias => account_alias)
        account_alias
      end

      # Delete an AWS account alias.
      #
      #     iam.account_aliases.delete('myaccountalias')
      #
      # @param [String] account_alias The account alias to delete.
      # @return [nil]
      def delete account_alias
        client.delete_account_alias(:account_alias => account_alias)
        nil
      end

      # @api private
      protected
      def request_method
        :list_account_aliases
      end

      # @api private
      protected
      def each_item response, &block
        response.data[:account_aliases].each do |account_alias|
          yield(account_alias)
        end
      end

    end
  end
end
