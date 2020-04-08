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

    # Represents a group of users.  Groups don't directly interact
    # with AWS; only users do. The main reason to create groups is to
    # collectively assign permissions to the users so they can do
    # their jobs. For example, you could have a group called Admins
    # and give that group the types of permissions admins typically
    # need.
    # @attr [String] name The group's name.
    # @attr_reader [String] id The group's unique ID.
    # @attr_reader [Time] create_date When the group was created.
    # @attr_reader [String] arn The group's ARN (Amazon Resource Name).
    # @attr [String] path The group's path.  Paths are used to identify
    #   which division or part of an organization the group belongs to.
    class Group < Resource

      prefix_update_attributes

      # @api private
      def initialize(name, options = {})
        options[:name] = name
        super
      end

      mutable_attribute :name, :static => true, :from => :group_name

      attribute :id, :static => true, :from => :group_id

      attribute :create_date, :static => true

      attribute :arn

      mutable_attribute :path do
        translates_input do |path|
          path = "/#{path}" unless path[0] == ?/
          path = "#{path}/" unless path[-1] == ?/
          path
        end
      end

      populates_from(:get_group, :create_group) do |resp|
        resp[:group] if resp[:group][:group_name] == name
      end

      populates_from(:list_groups, :list_groups_for_user) do |resp|
        resp[:groups].find {|g| g[:group_name] == name }
      end

      # (see Resource#exists?)
      def exists?; super; end

      # Deletes the group.  The group must not contain any users or
      # have any attached policies.
      def delete
        client.delete_group(:group_name => name)
        nil
      end

      # Provides access to the users in the group.  For example:
      #
      #     # get the names of all the users in the group
      #     group.users.map(&:name)
      #
      #     # remove all users from the group
      #     group.users.clear
      #
      # @return [GroupUserCollection] An object representing all the
      #   users in the group.
      def users
        GroupUserCollection.new(self)
      end

      # Provides access to the policies associated with the group.
      # For example:
      #
      #     # get the policy named "ReadOnly"
      #     group.policies["ReadOnly"]
      #
      #     # remove all policies associated with the group
      #     group.policies.clear
      #
      # @return [GroupPolicyCollection] An object representing all the
      #   policies associated with the group.
      def policies
        GroupPolicyCollection.new(self)
      end

      # @api private
      protected
      def resource_identifiers
        [[:group_name, name]]
      end

    end

  end
end
