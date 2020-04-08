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

    # # Stack Resource Summaries
    #
    # Stack summaries contain information about CloudFormation
    # stack resources.  You can enumerate these from a stack.
    #
    #     stack = cfm.stacks['stack-name']
    #     stack.resource_summaries.each do |summary|
    #       puts "#{summary[:physical_resource_id]}: #{summary[:resource_status]}"
    #     end
    #
    # Each summary yielded is a hash with the following keys:
    #
    #   * `:logical_resource_id`
    #   * `:physical_resource_id`
    #   * `:resource_type`
    #   * `:resource_status`
    #   * `:resource_status_reason`
    #   * `:last_updated_timestamp`
    #
    class StackResourceSummaryCollection

      include Core::Collection::WithNextToken

      # @param [Stack] stack
      # @param [Hash] options
      def initialize stack, options = {}
        @stack = stack
        super
      end

      # @return [Stack]
      attr_reader :stack

      protected

      def _each_item next_token, options = {}, &block
        options[:next_token] = next_token if next_token
        options[:stack_name] = stack.name
        resp = client.list_stack_resources(options)
        resp.data[:stack_resource_summaries].each do |summary|
          yield(summary)
        end
        resp.data[:next_token]
      end

    end
  end
end
