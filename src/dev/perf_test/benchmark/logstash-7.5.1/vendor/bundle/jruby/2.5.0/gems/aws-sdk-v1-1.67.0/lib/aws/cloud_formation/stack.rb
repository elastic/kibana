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

    # @attr_reader [String] template Returns the stack's template as a JSON
    #   string.
    #
    # @attr_reader [Time] creation_time The time the stack was created.
    #
    # @attr_reader [Time,nil] last_updated_time The time the stack was
    #   last updated.
    #
    # @attr_reader [String] stack_id Unique stack identifier.
    #
    # @attr_reader [String] status The status of the stack.
    #
    # @attr_reader [String] status_reason Success/Failure message
    #   associated with the `status`.
    #
    # @attr_reader [Array<String>] capabilities The capabilities
    #   allowed in the stack.
    #
    # @attr_reader [String] description User defined description
    #   associated with the stack.
    #
    # @attr_reader [Boolean] disable_rollback Specifies if the stack
    #   is rolled back due to stack creation errors.
    #
    # @attr_reader [Array<String>] notification_arns
    #   SNS topic ARNs to which stack related events are published.
    #
    # @attr_reader [Hash] parameters Returns a hash of stack parameters.
    #
    # @attr_reader [Integer] timeout
    #   The number of minutes within the stack creation should complete.
    #
    class Stack < Core::Resource

      include StackOptions

      # @api private
      def initialize name, options = {}
        @name = name
        super
      end

      # @return [String] Returns the stack name.
      attr_reader :name

      define_attribute_type :template

      define_attribute_type :list

      define_attribute_type :describe

      # returned by GetTemplate

      template_attribute :template, :from => :template_body

      alias_method :template_body, :template

      # returned by ListStacks & DescribeStacks

      list_attribute :creation_time, :static => true

      list_attribute :last_updated_time

      list_attribute :stack_id, :static => true

      list_attribute :status, :from => :stack_status

      list_attribute :status_reason, :from => :stack_status_reason

      # returned by DescribeStacks

      describe_attribute :capabilities

      describe_attribute :description

      describe_attribute :disable_rollback, :from => :disable_rollback?

      alias_method :disable_rollback?, :disable_rollback

      describe_attribute :notification_arns

      describe_attribute :output_details, :from => :outputs

      protected :output_details

      describe_attribute :parameters do
        translates_output do |params|
          params.inject({}) do |hash,param|
            hash.merge(param[:parameter_key] => param[:parameter_value])
          end
        end
      end

      describe_attribute :timeout, :from => :timeout_in_minutes

      alias_method :timeout_in_minutes, :timeout

      # attribute providers

      provider(:describe_stacks) do |provider|
        provider.find do |resp|
          resp.data[:stacks].find{|stack| stack[:stack_name] == name }
        end
        provider.provides(*(list_attributes.keys + describe_attributes.keys))
      end

      provider(:list_stacks) do |provider|
        provider.find do |resp|
          resp.data[:stack_summaries].find{|stack| stack[:stack_name] == name }
        end
        provider.provides *list_attributes.keys
      end

      provider(:get_template) do |provider|
        provider.find do |resp|
          resp if resp.request_options[:stack_name] == name
        end
        provider.provides *template_attributes.keys
      end

      # @return [Array<StackOutput>]
      def outputs
        output_details.collect do |o|
          key, value, desc = o.values_at(:output_key, :output_value, :description)
          StackOutput.new(self, key, value, desc)
        end
      end

      # @return [StackEventCollection] Returns a collection that represents
      #   all events for this stack.
      def events
        StackEventCollection.new(self)
      end

      # Returns a stack resource collection that enumerates all resources
      # for this stack.
      #
      #     stack.resources.each do |resource|
      #       puts "#{resource.resource_type}: #{resource.physical_resource_id}"
      #     end
      #
      # If you want a specific resource and you know its logical resource
      # id, you can use this collection to return a reference to it.
      #
      #     resource = stack.resources['logical-resource-id']
      #
      # @return [StackResourceCollection]
      #
      def resources
        StackResourceCollection.new(self)
      end

      # Returns a stack resource summary collection, that when enumerated
      # yields summary hashes.  Each hash has the following keys:
      #
      # * `:last_updated_timestamp`
      # * `:logical_resource_id`
      # * `:physical_resource_id`
      # * `:resource_status`
      # * `:resource_status_reason`
      # * `:resource_type`
      #
      # @return [StackResourceSummaryCollection]
      #
      def resource_summaries
        StackResourceSummaryCollection.new(self)
      end

      # @param [Hash] options
      #
      # @option options [String,URI,S3::S3Object,Object] :template
      #   A new stack template.  This may be provided in a number of formats
      #   including:
      #
      #     * a String, containing the template as a JSON document.
      #     * a URL String pointing to the document in S3.
      #     * a URI object pointing to the document in S3.
      #     * an {S3::S3Object} which contains the template.
      #     * an Object which responds to #to_json and returns the template.
      #
      # @option options [Hash] :parameters A hash that specifies the
      #   input parameters of the new stack.
      #
      # @option options[Array<String>] :capabilities The list of capabilities
      #   that you want to allow in the stack. If your stack contains IAM
      #   resources, you must specify the CAPABILITY_IAM value for this
      #   parameter; otherwise, this action returns an
      #   InsufficientCapabilities error. IAM resources are the following:
      #
      #     * AWS::IAM::AccessKey
      #     * AWS::IAM::Group
      #     * AWS::IAM::Policy
      #     * AWS::IAM::User
      #     * AWS::IAM::UserToGroupAddition
      #
      # @return [nil]
      #
      def update options = {}
        client_opts = options.dup

        apply_stack_name(name, client_opts)
        apply_template(client_opts)
        apply_parameters(client_opts)

        client.update_stack(client_opts)

        nil
      end

      # @return (see CloudFormation#estimate_template_cost)
      def estimate_template_cost
        cloud_formation = CloudFormation.new(:config => config)
        cloud_formation.estimate_template_cost(template, parameters)
      end

      # Deletes the current stack.
      # @return [nil]
      def delete
        client.delete_stack(:stack_name => name)
        nil
      end

      # @return [Boolean]
      def exists?
        begin
          client.describe_stacks(resource_options)
          true
        rescue Errors::ValidationError
          false
        end
      end

      protected

      def resource_identifiers
        [[:stack_name, name]]
      end

      def get_resource attribute
        if attribute.name == :template
          client.get_template(resource_options)
        else
          client.describe_stacks(resource_options)
        end
      end

    end
  end
end
