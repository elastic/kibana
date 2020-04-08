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

require 'aws/core'
require 'aws/cloud_formation/config'

module AWS

  # # AWS::CloudFormation
  #
  # Provides an expressive, object-oriented interface to AWS CloudFormation.
  #
  # ## Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the CloudFormation interface:
  #
  #     cf = AWS::CloudFormation.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Stacks
  #
  # This is the starting point for working with CloudFormation.
  #
  # ## Creating a Stack
  #
  # You can create a CloudFormation stack with a name and a template.
  #
  #     template = <<-TEMPLATE
  #     {
  #       "AWSTemplateFormatVersion" : "2010-09-09",
  #       "Description": "A simple template",
  #       "Resources": {
  #         "web": {
  #           "Type": "AWS::EC2::Instance",
  #           "Properties": {
  #             "ImageId": "ami-41814f28"
  #           }
  #         }
  #       }
  #     }
  #     TEMPLATE
  #
  #     cfm = AWS::CloudFormation.new
  #     stack = cfm.stacks.create('stack-name', template)
  #
  # See {StackCollection#create} for more information on creating templates
  # with capabilities and parameters.
  #
  # ## Getting a Stack
  #
  # Given a name, you can fetch a {Stack}.
  #
  #     stack = cfm.stacks['stack-name']
  #
  # ## Enumerating Stacks
  #
  # You can enumerate stacks in two ways.  You can enumerate {Stack}
  # objects or stack summaries (simple hashes).  You can filter the stack
  # summary collection by a status.
  #
  #     # enumerating all stack objects
  #     cfm.stacks.each do |stack|
  #       # ...
  #     end
  #
  #     # enumerating stack summaries (hashes)
  #     cfm.stack_summaries.each do |stack_summary|
  #       # ...
  #     end
  #
  #     # filtering stack summaries by status
  #     cfm.stack_summaries.with_status(:create_failed).each do |summary|
  #       puts summary.to_yaml
  #     end
  #
  # ## Template
  #
  # You can fetch the template body for a stack as a JSON string.
  #
  #     cfm.stacks['stack-name'].template
  #     #=> "{...}"
  #
  # You can update the template for a {Stack} with the {Stack#update} method:
  #
  #     cfm.stacks['stack-name'].update(:template => new_template)
  #
  # ## Stack Events
  #
  # You can enumerate events for a stack.
  #
  #     stack.events.each do |event|
  #       puts "#{event.physical_resource_id}: #{event.resource_status}"
  #     end
  #
  # See {StackEvent} for a complete list of event attributes.
  #
  # ## Stack Resources
  #
  # You can enumerate stack resources or request a stack resource by its
  # logical resource id.
  #
  #     # enumerating stack resources
  #     stack.resources.each do |resource|
  #       # ...
  #     end
  #
  #     # getting a resource by its logical id
  #     res = stack.resources['logical-resource-id']
  #     puts res.physical_resource_id
  #
  # If you need a stack resource, but only have its physical resource
  # id, then you can call {CloudFormation#stack_resource}.
  #
  #     stack_resource = cfm.stack_resource('physical-resource-id')
  #
  # ## Stack Resource Summaries
  #
  # As an alternative to stack resources, you can enumerate stack
  # resource summaries (hashes).
  #
  #     # enumerate all resources, this collection can not be filtered
  #     stack.resource_summaries.each do |summary|
  #       # ...
  #     end
  #
  # @!attribute [r] client
  #   @return [Client] the low-level CloudFormation client object
  class CloudFormation

    autoload :Client, 'aws/cloud_formation/client'
    autoload :Errors, 'aws/cloud_formation/errors'
    autoload :Stack, 'aws/cloud_formation/stack'
    autoload :StackCollection, 'aws/cloud_formation/stack_collection'
    autoload :StackEvent, 'aws/cloud_formation/stack_event'
    autoload :StackEventCollection, 'aws/cloud_formation/stack_event_collection'
    autoload :StackOptions, 'aws/cloud_formation/stack_options'
    autoload :StackOutput, 'aws/cloud_formation/stack_output'
    autoload :StackSummaryCollection, 'aws/cloud_formation/stack_summary_collection'
    autoload :StackResource, 'aws/cloud_formation/stack_resource'
    autoload :StackResourceCollection, 'aws/cloud_formation/stack_resource_collection'
    autoload :StackResourceSummaryCollection, 'aws/cloud_formation/stack_resource_summary_collection'

    include Core::ServiceInterface
    include StackOptions

    endpoint_prefix 'cloudformation'

    # @return [StackCollection]
    def stacks
      StackCollection.new(:config => config)
    end

    # @return [StackSummaryCollection]
    def stack_summaries
      StackSummaryCollection.new(:config => config)
    end

    # Returns a stack resource with the given physical resource
    # id.
    #
    #     resource = cfm.stack_resource('i-123456789')
    #
    # Alternatively, you may pass a stack name and logical resource id:
    #
    #     resource = cfm.stack_resource('stack-name', 'logical-resource-id')
    #
    # @overload stack_resource(physical_resource_id)
    #   @param [String] physical_resource_id The physical resource id
    #     of the stack resource you want returned.
    #
    # @overload stack_resource(stack_name, logical_resource_id)
    #   @param [String] stack_name
    #   @param [String] logical_resource_id
    #
    # @return [StackResource] Returns the stack resource with the
    #   given physical resource id.
    #
    def stack_resource *args

      client_opts = {}

      if args.size == 1
        client_opts[:physical_resource_id] = args.first
      else
        client_opts[:stack_name] = args[0]
        client_opts[:logical_resource_id] = args[1]
      end

      response = client.describe_stack_resources(client_opts)

      details = response.stack_resources.first

      StackResource.new_from(
        :describe_stack_resource, details,
        Stack.new(details.stack_name, :config => config),
        details.logical_resource_id)

    end

    # Validates the template and returns a hash.  If the template is valid,
    # the returned hash may/will contain the following keys (actual
    # key list depends on the template).
    #
    #   * `:description`
    #   * `:capabilities`
    #   * `:capabilities_reason`
    #   * `:parameters`
    #
    # If the template is not parseable, then a hash will the following
    # keys will be returned:
    #
    #   * `:code`
    #   * `:message`
    #
    # @return [Hash]
    #
    def validate_template template
      begin

        client_opts = {}
        client_opts[:template] = template
        apply_template(client_opts)
        client.validate_template(client_opts).data

      rescue CloudFormation::Errors::ValidationError => e

        results = {}
        results[:code] = e.code
        results[:message] = e.message
        results

      end
    end

    # @param (see Stack#template=)
    #
    # @param [Hash] parameters A hash that specifies the input
    #   parameters for the template.
    #
    # @return [String] Returns a URL to the AWS Simple Monthly Calculator
    #   with a query string that describes the resources required to run
    #   the template.
    #
    def estimate_template_cost template, parameters = {}
      client_opts = {}
      client_opts[:template] = template
      client_opts[:parameters] = parameters
      apply_template(client_opts)
      apply_parameters(client_opts)
      client.estimate_template_cost(client_opts).url
    end

  end
end
