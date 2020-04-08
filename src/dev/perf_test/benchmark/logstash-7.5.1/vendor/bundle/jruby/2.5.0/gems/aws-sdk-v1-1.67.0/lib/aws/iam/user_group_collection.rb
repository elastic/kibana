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

    # A collection that provides access to IAM groups to which a
    # particular user belongs.
    #
    #     user = AWS::IAM.new.users.first
    #     groups = user.groups
    #     groups.each { |g| puts g.name }
    #
    class UserGroupCollection

      include Collection

      # @attr_reader [User] The user.
      attr_reader :user

      # @api private
      def initialize(user, opts = {})
        @user = user
        super
      end

      # Adds the user to a group.
      #
      # @param [Group] group The group to which the user should be added.
      def add(group)
        client.add_user_to_group(:group_name => group.name,
                                 :user_name => user.name)
        nil
      end

      # Removes the user from a group.
      #
      # @param [Group] group The group from which the user should be removed
      def remove(group)
        client.remove_user_from_group(:group_name => group.name,
                                      :user_name => user.name)
        nil
      end

      # Removes this user from all groups.
      # @return [nil]
      def clear
        each do |group|
          remove(group)
        end
      end

      # Yields once for each group that the user is in.
      #
      # @param [Hash] options
      #
      # @option options [Integer] :limit Limits the number of groups
      #   that are returned.
      #
      # @option options [Integer] :batch_size Controls how many groups
      #   are requested from the service at once.
      #
      # @yieldparam [Group] group
      #
      # @return [nil]
      def each(options = {}, &block)
        super(options.merge(:user_name => user.name), &block)
      end

      # @api private
      protected
      def request_method
        :list_groups_for_user
      end

      # @api private
      protected
      def each_item response
        response.groups.each do |g|
          group = Group.new_from(:list_groups_for_user, g, g.group_name, :config => config)
          yield(group)
        end
      end

    end

  end
end
