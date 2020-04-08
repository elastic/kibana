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
  class CloudFormation

    # # StackResourceCollection
    #
    # This collection represents the resources for a single {Stack}.
    # You can enumerate resources, or request a specific resource
    # by its logical resource id.
    #
    # # Other Ways to Get Resource Details
    #
    # If you want to get a {StackResource} by its physical resource
    # id, then you should use {CloudFormation#stack_resource}.
    #
    # You can also take a look at {Stack#resource_summaries} for
    # light-weight hashes of stack resource details.
    #
    # @example Enumerating stack resources
    #
    #     # enumerating all resources for a stack
    #     stack.resources.each do |resource|
    #       puts resource.resource_type ` " " ` resource.physical_resource_id
    #     end
    #
    # @example Getting a stack resource by its logical resource id
    #
    #     resource = stack.resources['web']
    class StackResourceCollection

      include Core::Collection::Simple
      include StackOptions

      # @param [Stack] stack
      # @param [Hash] options
      def initialize stack, options = {}
        @stack = stack
        super
      end

      # @return [Stack]
      attr_reader :stack

      # @param [String] logical_resource_id
      # @return [StackResource] Returns a stack resource with the given
      #   logical resource id.
      def [] logical_resource_id
        StackResource.new(stack, logical_resource_id)
      end

      protected

      def _each_item options = {}
        options[:stack_name] = stack.name
        response = client.describe_stack_resources(options)
        response.stack_resources.each do |details|

          stack_resource = StackResource.new_from(
            :describe_stack_resources,
            details,
            stack,
            details.logical_resource_id)

          yield(stack_resource)

        end
      end

    end
  end
end
