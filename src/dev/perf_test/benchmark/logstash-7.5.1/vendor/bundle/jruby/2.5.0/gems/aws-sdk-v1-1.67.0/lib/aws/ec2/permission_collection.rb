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
  class EC2

    # Represents the collection of permissions for an EC2 resource.
    # Each permission is a string containing the AWS account ID of a
    # user who has permission to use the resource in question.  The
    # {Image} and {Snapshot} classes are currently the only ones
    # that use this interface.
    class PermissionCollection

      include Core::Model
      include Enumerable

      # @api private
      def initialize(resource, opts = {})
        @resource = resource
        super(opts)
      end

      # @yield [user_id] Each user ID that has explicit
      #   permissions to launch this AMI.
      def each(&block)
        resp = client.send(describe_call, describe_params)
        resp.send(inflected_permissions_attribute).each do |permission|
          if permission[:user_id]
            user_id = permission[:user_id]
            yield(user_id)
          end
        end
      end

      # @return [Integer] The number of users that have explicit
      #   permissions to launch this AMI.
      def size
        inject(0) { |sum, i| sum + 1 }
      end

      # @return [Boolean] True if the collection is empty.
      def empty?
        size == 0
      end

      # @return [Boolean] True if the resource is public.
      def public?
        resp = client.send(describe_call, describe_params)
        resp.send(inflected_permissions_attribute).any? do |permission|
          permission[:group] and permission[:group] == "all"
        end
      end

      # @return [Boolean] True if the resource is private (i.e. not
      #   public).
      def private?
        !public?
      end

      # Sets whether the resource is public or not.  This has no
      # effect on the explicit AWS account IDs that may already have
      # permissions to use the resource.
      #
      # @param [Boolean] value If true, the resource is made public,
      #   otherwise the resource is made private.
      # @return [nil]
      def public= value
        params = value ?
          { :add => [{ :group => "all" }] } :
          { :remove => [{ :group => "all" }] }
        client.send(modify_call, modify_params(params))
        nil
      end

      # Adds permissions for specific users to launch this AMI.
      #
      # @param [Array of Strings] users The AWS account IDs of the
      #   users that should be able to launch this AMI.
      # @return [nil]
      def add(*users)
        modify(:add, *users)
      end

      # Removes permissions for specific users to launch this AMI.
      # @param [Array of Strings] users The AWS account IDs of the
      #   users that should no longer be able to launch this AMI.
      # @return [nil]
      def remove(*users)
        modify(:remove, *users)
      end

      # Resets the launch permissions to their default state.
      # @return [nil]
      def reset
        client.send(reset_call, reset_params)
      end

      # @api private
      private
      def describe_call
        "describe_#{resource_name}_attribute"
      end

      # @api private
      private
      def modify_call
        "modify_#{resource_name}_attribute"
      end

      # @api private
      private
      def reset_call
        "reset_#{resource_name}_attribute"
      end

      # @api private
      private
      def describe_params
        Hash[[["#{resource_name}_id".to_sym, @resource.send(:__resource_id__)],
              [:attribute, permissions_attribute]]]
      end
      alias_method :reset_params, :describe_params

      # @api private
      private
      def inflected_permissions_attribute
        Core::Inflection.ruby_name(permissions_attribute).to_sym
      end

      # @api private
      private
      def permissions_attribute
        @resource.__permissions_attribute__
      end

      # @api private
      private
      def resource_name
        @resource.send(:inflected_name)
      end

      # @api private
      private
      def modify(action, *users)
        return if users.empty?
        opts = modify_params(Hash[[[action,
                                    users.map do |user_id|
                                      { :user_id => user_id }
                                    end]]])
        client.send(modify_call, opts)
        nil
      end

      # @api private
      private
      def modify_params(modifications)
        Hash[[["#{resource_name}_id".to_sym, @resource.send(:__resource_id__)],
              [inflected_permissions_attribute, modifications]]]
      end

    end

  end
end
