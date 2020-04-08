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

    # @attr_reader [String,nil] description
    #   User defined description associated with the resource.
    #
    # @attr_reader [String] physical_resource_id
    #   The name or unique identifier that corresponds to a physical instance
    #   ID of a resource supported by AWS CloudFormation.
    #
    # @attr_reader [Symbol] resource_status
    #   Current status of the resource.
    #
    # @attr_reader [String,nil] resource_status_reason
    #   Success/failure message associated with the resource.
    #
    # @attr_reader [String] resource_type
    #   Type of the resource (e.g. 'AWS::EC2::Instance')
    #
    # @attr_reader [String] stack_name
    #   The name associated with the stack.
    #
    # @attr_reader [String] stack_id
    #   Unique identifier of the stack.
    #
    # @attr_reader [Time] last_updated_timestamp
    #   When the status was last updated.
    #
    # @attr_reader [String,nil] metadata
    #   The JSON format content of the Metadata attribute declared for the
    #   resource.
    #
    class StackResource < Core::Resource

      # @api private
      def initialize stack, logical_resource_id, options = {}
        @stack = stack
        @logical_resource_id = logical_resource_id
        super
      end

      # @return [Stack]
      attr_reader :stack

      # @return [String] The logical name of the resource specified in
      #   the template.
      attr_reader :logical_resource_id

      define_attribute_type :common # return by both describe stack resource methods

      define_attribute_type :detail # returned by DescribeStackResource (singular)

      common_attribute :description, :static => true

      common_attribute :physical_resource_id, :static => true

      common_attribute :resource_status

      common_attribute :resource_status_reason

      common_attribute :resource_type, :static => true

      common_attribute :stack_name, :static => true

      common_attribute :stack_id, :static => true

      # provided by DescribeStackResource

      detail_attribute :last_updated_timestamp

      detail_attribute :metadata

      # this operation returns all attributes
      populates_from(:describe_stack_resource) do |resp|
        resp.stack_resource_detail if
          resp.stack_resource_detail.logical_resource_id == logical_resource_id
      end

      # This method provides ALL attributes except :metadata.  The
      # :last_updated_timestamp attribute is also provided by
      # a differnt name (:timestamp instead of :last_updated_timestamp).
      provider(:describe_stack_resources) do |provider|
        provider.find do |resp|
          resp.stack_resources.find do |resource|
            resource.logical_resource_id == logical_resource_id
          end
        end
        provider.provides *common_attributes.keys
        provider.provides :last_updated_timestamp, :from => :timestamp
      end

      protected

      def resource_identifiers
        [[:stack_name, stack.name], [:logical_resource_id, logical_resource_id]]
      end

      def get_resource attribute = nil
        client.describe_stack_resource(resource_options)
      end

    end
  end
end
