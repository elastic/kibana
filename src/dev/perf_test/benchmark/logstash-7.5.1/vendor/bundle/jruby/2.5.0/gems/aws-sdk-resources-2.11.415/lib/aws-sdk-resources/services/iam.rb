module Aws
  module IAM
    class Resource

      # @return [Seahorse::Client::Response, false] Returns the response
      #   from {Client#delete_account_alias} if an alias was deleted.
      #   Returns `false` if this account had no alias to remove.
      # @see Client#delete_account_alias
      def delete_account_alias
        if name = @client.list_account_aliases.account_aliases.first
          @client.delete_account_alias(account_alias: name)
        else
          false
        end
      end

    end
  end
end
