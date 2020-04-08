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

    class StackEventCollection

      include Core::Collection::Simple

      # @param [Stack] stack
      # @param [Hash] options
      def initialize stack, options = {}
        @stack = stack
        super
      end

      # @return [Stack]
      attr_reader :stack

      protected

      def _each_item options = {}
        options[:stack_name] = stack.name
        resp = client.describe_stack_events(options)
        resp.data[:stack_events].each do |details|

          event = StackEvent.new(stack, details)

          yield(event)

        end
      end

    end
  end
end
