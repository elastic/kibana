# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

require 'uri'
require 'json'

module AWS
  class IAM

    class UserPolicy < Resource

      # @param [User] user The user this user policy belongs to.
      # @param [String] name The name of this user policy.
      # @param [Hash] options
      def initialize user, name, options = {}
        @user = user
        @name = name
        super
      end

      # @return [User] Returns the user this user policy belongs to.
      attr_reader :user

      # @return [String] Returns the name of this user policy.
      attr_reader :name

      # @api private
      module PolicyProxy

        attr_accessor :user_policy

        def change
          yield(self)
          user_policy.policy = self
        end

      end

      # @return [Policy] Returns the actual policy document for this
      #   user policy.
      def policy

        response = client.get_user_policy(
          :user_name => user.name,
          :policy_name => name)

        policy = Policy.from_json(URI.decode(response.policy_document))
        policy.extend(PolicyProxy)
        policy.user_policy = self
        policy

      end

      # Replaces or updates the user policy with the given policy document.
      # @param [Policy] policy
      # @return [nil]
      def policy= policy

        policy_document = policy.is_a?(String) ? policy : policy.to_json

        options = {}
        options[:user_name] = user.name
        options[:policy_name] = name
        options[:policy_document] = policy_document

        client.put_user_policy(options)

        nil
      end

      # Deletes this user policy.
      # @return [nil]
      def delete
        client.delete_user_policy(:user_name => user.name, :policy_name => name)
        nil
      end

    end

  end
end
