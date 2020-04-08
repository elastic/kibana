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
  class SimpleWorkflow

    # Domains are used to organize workflows types and activities for
    # an account.
    #
    # @attr_reader [String,nil] description Returns
    #
    # @attr_reader [Integer,Symbol] retention_period Returns the retention
    #   period for this domain. The return value may be an integer (number
    #   of days history is kept around) or the symbol `:none`, implying
    #   no expiry of closed workflow executions.
    #
    # @attr_reader [Symbol] status Returns the domain's status.  Status will
    #   be either `:registered` or `:deprecated`.
    #
    class Domain < Resource

      include OptionFormatters

      # @api private
      def initialize name, options = {}
        @name = name.to_s
        super(options)
      end

      # @return [String] Returns the name of this domain.
      attr_reader :name

      info_attribute :description, :static => true

      info_attribute :status, :to_sym => true

      config_attribute :retention_period,
        :from => 'workflowExecutionRetentionPeriodInDays',
        :duration => true,
        :static => true

      # @return [WorkflowTypeCollection]
      def workflow_types
        WorkflowTypeCollection.new(self)
      end

      # @return [ActivityTypeCollection]
      def activity_types
        ActivityTypeCollection.new(self)
      end

      # @return [WorkflowExecutionCollection]
      def workflow_executions
        WorkflowExecutionCollection.new(self)
      end

      # @return [DecisionTaskCollection]
      def decision_tasks
        DecisionTaskCollection.new(self)
      end

      # @return [ActivityTaskCollection]
      def activity_tasks
        ActivityTaskCollection.new(self)
      end

      # @return [Boolean] Returns true if this domain has been deprecated.
      def deprecated?
        self.status == :deprecated
      end

      # Deprecates the domain. After a domain has been deprecated it cannot
      # be used to create new workflow executions or register new types.
      # However, you can still use visibility actions on this domain.
      #
      # Deprecating a domain also deprecates all activity and workflow
      # types registered in the domain. Executions that were started
      # before the domain was deprecated will continue to run.
      #
      # @return [nil]
      #
      def deprecate
        client.deprecate_domain(:name => name)
        nil
      end
      alias_method :delete, :deprecate

      provider(:describe_domain) do |provider|
        provider.provides *info_attributes.keys
        provider.provides *config_attributes.keys
        provider.find do |resp|
          if resp.data['domainInfo']['name'] == name
            resp.data['domainInfo'].merge(resp.data['configuration'])
          end
        end
      end

      provider(:list_domains) do |provider|
        provider.provides *info_attributes.keys
        provider.find do |resp|
          resp.data['domainInfos'].find{|d| d['name'] == name }
        end
      end

      protected
      def resource_identifiers
        [[:name,name]]
      end

    end
  end
end
