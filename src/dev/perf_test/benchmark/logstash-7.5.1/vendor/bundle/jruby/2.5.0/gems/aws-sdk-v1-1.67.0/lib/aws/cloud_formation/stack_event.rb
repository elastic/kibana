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

    # # Stack Event
    #
    # You can get stack events from a {Stack} object.
    #
    #     stack = cfm.stacks['stack-name']
    #     stack.events.each do |event|
    #       puts "#{event.timestamp}: #{event.resource_status}"
    #     end
    class StackEvent

      # @api private
      def initialize stack, details
        @stack = stack
        details.each_pair do |attr_name,attr_value|
          instance_variable_set("@#{attr_name}", attr_value)
        end
      end

      # @return [Stack] stack The stack this event belongs to.
      attr_reader :stack

      # @return [String] event_id The unique ID of this event.
      attr_reader :event_id

      # @return [String] The logical name of the resource specified
      #   in the template.
      attr_reader :logical_resource_id

      # @return [String] The name or unique identifier associated with the
      #   physical instance of the resource.
      attr_reader :physical_resource_id

      # @return [String] BLOB of the properties used to create the resource.
      attr_reader :resource_properties

      # @return [Symbol] Current status of the resource.
      attr_reader :resource_status

      # @return [String,nil] Success/failure message associated with the
      #   resource.
      attr_reader :resource_status_reason

      # @return [String] Type of the resource (e.g. 'AWS::EC2::Instance').
      attr_reader :resource_type

      # @return [String] The unique ID name of the instance of the stack.
      attr_reader :stack_id

      # @return [String] The name associated with a stack.
      attr_reader :stack_name

      # @return [Time] When the status was last updated.
      attr_reader :timestamp

    end
  end
end
