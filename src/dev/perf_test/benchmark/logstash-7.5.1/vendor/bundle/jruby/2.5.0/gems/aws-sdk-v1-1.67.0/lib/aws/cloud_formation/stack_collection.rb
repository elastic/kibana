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
    class StackCollection

      include Core::Collection::WithNextToken
      include StackOptions

      # @api private
      def initialize options = {}
        @status_filters = options[:status_filters] || []
        super
      end

      # Creates a new stack.
      #
      # @example Creating a stack with a template string.
      #
      #   template = <<-JSON
      #    {
      #      "AWSTemplateFormatVersion" : "2010-09-09",
      #      "Description": "A simple template",
      #      "Resources": {
      #        "web": {
      #          "Type": "AWS::EC2::Instance",
      #          "Properties": {
      #            "ImageId": "ami-41814f28"
      #          }
      #        }
      #      }
      #   }
      #   JSON
      #   stack = cfm.stacks.create('stack-name', template)
      #
      # @example Creating a stack from an S3 object.
      #
      #   template = AWS::S3.new.buckets['templates'].objects['template-1']
      #   stack = cfm.stacks.create('stack-name', template)
      #
      # @example Creating a stack with 3 parameters.
      #
      #   template = <<-JSON
      #   {
      #     "AWSTemplateFormatVersion" : "2010-09-09",
      #     "Description": "A simple template",
      #     "Parameters" : {
      #       "KeyName" : {
      #         "Description" : "Name of a KeyPair to use with SSH.",
      #         "Type" : "String"
      #       },
      #       "SecurityGroup" : {
      #         "Description" : "The security group to launch in.",
      #         "Type" : "String"
      #       },
      #       "InstanceType" : {
      #         "Description" : "The size of instance to launch.",
      #         "Type" : "String"
      #       }
      #     },
      #     "Resources": {
      #       "web": {
      #         "Type": "AWS::EC2::Instance",
      #         "Properties": {
      #           "InstanceType": { "Ref" : "InstanceType" },
      #           "SecurityGroups" : [ {"Ref" : "SecurityGroup"} ],
      #           "KeyName": { "Ref" : "KeyName" },
      #           "ImageId": "ami-41814f28"
      #         }
      #       }
      #     }
      #   }
      #   JSON
      #
      #   stack = cfm.stacks.create('name', template, :parameters => {
      #     'KeyName' => 'key-pair-name',
      #     'SecurityGroup' => 'security-group-name',
      #     'InstanceType' => 'm1.large',
      #   })
      #
      # @param [String] stack_name
      #
      # @param [String,URI,S3::S3Object,Object] template The stack template.
      #   This may be provided in a number of formats including:
      #
      #     * a String, containing the template as a JSON document.
      #     * a URL String pointing to the document in S3.
      #     * a URI object pointing to the document in S3.
      #     * an {S3::S3Object} which contains the template.
      #     * an Object which responds to #to_json and returns the template.
      #
      # @param [Hash] options
      #
      # @option options [Array<String>] :capabilities The list of capabilities
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
      # @option options [Boolean] :disable_rollback (false)
      #   Set to true to disable rollback on stack creation failures.
      #
      # @option options [Object] :notify One or more SNS topics ARN
      #   string or {SNS::Topic} objects.  This param may be passed
      #   as a single value or as an array. CloudFormation will publish
      #   stack related events to these topics.
      #
      # @option options [Hash] :parameters A hash that specifies the
      #   input parameters of the new stack.
      #
      # @option options [Integer] :timeout The number of minutes
      #   that may pass before the stack creation fails.  If
      #   `:disable_rollback` is false, the stack will be rolled back.
      #
      # @return [Stack]
      #
      def create stack_name, template, options = {}

        client_opts = options.dup
        client_opts[:template] = template

        apply_stack_name(stack_name, client_opts)
        apply_template(client_opts)
        apply_disable_rollback(client_opts)
        apply_notification_arns(client_opts)
        apply_parameters(client_opts)
        apply_timeout(client_opts)

        resp = client.create_stack(client_opts)

        Stack.new(stack_name, :config => config, :stack_id => resp.stack_id)

      end

      def [] stack_name
        Stack.new(stack_name, :config => config)
      end

      # Limits the stacks that are enumerated.
      #
      #   cloud_formation.stacks.with_status(:create_complete).each do |stack|
      #     puts stack.name
      #   end
      #
      # You can provide multiple statuses:
      #
      #   statuses = [:create_failed, :rollback_failed]
      #   cloud_formation.stacks.with_status(statuses).each do |stack|
      #     puts stack.name
      #   end
      #
      # Status names may be symbolized (snake-cased) or upper-cased strings
      # (e.g. :create_in_progress, 'CREATE_IN_PROGRESS').
      #
      # @param [Symbol,String] status_filters A status to filter stacks with.
      #   Valid values include:
      #
      #     * `:create_in_progress`
      #     * `:create_failed`
      #     * `:create_complete`
      #     * `:rollback_in_progress`
      #     * `:rollback_failed`
      #     * `:rollback_complete`
      #     * `:delete_in_progress`
      #     * `:delete_failed`
      #     * `:delete_complete`
      #     * `:update_in_progress`
      #     * `:update_complete_cleanup_in_progress`
      #     * `:update_complete`
      #     * `:update_rollback_in_progress`
      #     * `:update_rollback_failed`
      #     * `:update_rollback_complete_cleanup_in_progress`
      #     * `:update_rollback_complete`
      #
      # @return [StackCollection] Returns a new stack collection that
      #   filters the stacks returned by the given status.
      #
      def with_status *status_filters
        filters = @status_filters + status_filters.flatten.map(&:to_s).map(&:upcase)
        StackCollection.new(:status_filters => filters, :config => config)
      end

      protected

      def _each_item next_token, options = {}
        options[:next_token] = next_token if next_token

        if @status_filters.empty?
          api_method = :describe_stacks
          resp_key = :stacks
        else
          api_method = :list_stacks
          resp_key = :stack_summaries
          options[:stack_status_filter] = @status_filters
        end

        resp = client.send(api_method, options)

        resp[resp_key].each do |data|

          stack = Stack.new_from(
            api_method,
            data,
            data[:stack_name],
            :config => config)

          yield(stack)

        end
        resp[:next_token]
      end

    end
  end
end
