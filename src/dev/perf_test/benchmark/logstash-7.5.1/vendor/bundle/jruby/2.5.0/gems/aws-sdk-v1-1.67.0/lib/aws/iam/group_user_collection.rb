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

    # A collection that provides access to IAM users belonging to a
    # particular group.
    #
    #     group = AWS::IAM.new.groups.first
    #     users = group.users
    #     users.each { |u| puts u.name }
    #
    class GroupUserCollection

      include Core::Collection::Simple

      # @api private
      def initialize group, options = {}
        @group = group
        super
      end

      # @attr_reader [Group] The group.
      attr_reader :group

      # Adds a user to the group.
      #
      # @param [User] user The user to add.
      # @return [nil]
      def add(user)

        client.add_user_to_group(
          :group_name => group.name,
          :user_name => user.name)

        nil

      end

      # Remove a user from the group.
      #
      # @param [User] user The user to remove.
      # @return [nil]
      def remove(user)

        client.remove_user_from_group(
          :group_name => group.name,
          :user_name => user.name)

        nil

      end

      # Removes all users from this group.
      # @return [nil]
      def clear
        each {|user| remove(user) }
      end

      # @api private
      protected
      def _each_item options = {}, &block
        response = client.get_group(:group_name => group.name)
        response.users.each do |u|
          user = User.new_from(:get_group, u, u.user_name, :config => config)
          yield(user)
        end
      end

    end

  end
end
