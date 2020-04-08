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

    # ## Registering a WorkflowType
    #
    # To register a workflow type you should use the #workflow_types method
    # on the domain:
    #
    #     domain.workflow_types.register('name', 'version', { ... })
    #
    # See {WorkflowTypeCollection#register} for a complete list of options.
    #
    # ## Deprecating a workflow type
    #
    # WorkflowType inherits from the generic {Type} base class.  Defined in
    # {Type} are a few useful methods including:
    #
    # * {Type#deprecate}
    # * {Type#deprecated?}
    #
    # You can use these to deprecate a workflow type:
    #
    #     domain.workflow_types['name','version'].deprecate
    #
    # @attr_reader [Time] creation_date When the workflow type was registered.
    #
    # @attr_reader [Time,nil] deprecation_date When the workflow type
    #   was deprecated, or nil if the workflow type has not been deprecated.
    #
    # @attr_reader [String,nil] description The description of this workflow
    #   type, or nil if was not set when it was registered.
    #
    # @attr_reader [Symbol] status The status of this workflow type.  The
    #   status will either be `:registered` or `:deprecated`.
    #
    # @attr_reader [Symbol,nil] default_child_policy Specifies the default
    #   policy to use for the child workflow executions when a workflow
    #   execution of this type is terminated.  Values may be one of the
    #   following (or nil):
    #
    #   * `:terminate` - the child executions will be terminated.
    #
    #   * `:request_cancel` - a request to cancel will be attempted for each
    #     child execution by recording a WorkflowExecutionCancelRequested
    #     event in its history. It is up to the decider to take appropriate
    #     actions when it receives an execution history with this event.
    #
    #   * `:abandon` - no action will be taken. The child executions will
    #     continue to run.
    #
    # @attr_reader [Integer,:none,nil] default_execution_start_to_close_timeout
    #   The default maximum duration for executions of this workflow type.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    # @attr_reader [String,nil] default_task_list Specifies
    #   the default task list to use for scheduling decision tasks for
    #   executions of this workflow type.
    #
    # @attr_reader [Integer,nil] default_task_priority Specifies the
    #   default task priority for this workflow type at registration.
    #   This default task priority is used if a task priority is not provided
    #   when a task is scheduled.
    #
    # @attr_reader [Integer,:none,nil] default_task_start_to_close_timeout
    #   The default maximum duration of decision tasks for this workflow type.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    class WorkflowType < Type

      include OptionFormatters

      type_attribute :creation_date, :timestamp => true

      type_attribute :deprecation_date, :timestamp => true, :static => false

      type_attribute :description

      type_attribute :status, :to_sym => true, :static => false

      config_attribute :default_child_policy, :to_sym => true

      config_attribute :default_execution_start_to_close_timeout,
        :duration => true

      config_attribute :default_task_list do
        translates_output {|v| v['name'] }
      end

      config_attribute :default_task_priority do
        translates_output {|v| v.to_i }
      end

      config_attribute :default_task_start_to_close_timeout,
        :duration => true

      # @param [Hash] options
      #
      # @option (see DecisionTask#continue_as_new_workflow_execution)
      #
      # @option options [String] :workflow_id
      #   A user defined identifier associated with the workflow execution.
      #   You can use this to associate a custom identifier with the
      #   workflow execution. You may specify the same identifier if a
      #   workflow execution is logically a restart of a previous execution.
      #   You cannot have two open workflow executions with the same
      #   :workflow_id at the same time.
      #
      #   If you do not provide `:workflow_id` a random UUID will be generated.
      #
      # @return [WorkflowExecution] Returns the new workflow execution.
      #
      def start_execution options = {}

        options[:domain] = domain.name
        start_execution_opts(options, self)
        response = client.start_workflow_execution(options)

        workflow_id = options[:workflow_id]
        run_id = response.data['runId']

        domain.workflow_executions[workflow_id, run_id]

      end

      # Returns a count of workflow executions of this workflow type.
      #
      # @example
      #
      #   domain.workflow_types['name','version'].count
      #
      # @note (see WorkflowExecution#count_executions)
      # @param (see WorkflowExecution#count_executions)
      # @option (see WorkflowExecution#count_executions)
      # @return [Integer] Returns the count of workflow execution of this type.
      def count_executions options = {}
        options[:workflow_type] = self
        domain.workflow_executions.count(options)
      end

      # @return [WorkflowExecutionCollection] Returns a collection that
      #   enumerates only workflow executions of this type.
      def workflow_executions
        WorkflowExecutionCollection.new(domain).with_workflow_type(self)
      end

      # list workflow type only provides type attributes
      provider(:list_workflow_types) do |provider|
        provider.provides *type_attributes.keys
        provider.find do |resp|
          desc = resp.data['typeInfos'].find do |info|
            info[self.class.type_key] == { 'name' => name, 'version' => version }
          end
        end
      end

      # describe workflow type provides type and config attributes
      provider(:describe_workflow_type) do |provider|
        provider.provides *type_attributes.keys
        provider.provides *config_attributes.keys
        provider.find do |resp|
          type = { 'name' => name, 'version' => version }
          resp.data['typeInfo'][self.class.type_key] == type ?
            resp.data['typeInfo'].merge(resp.data['configuration']) : nil
        end
      end

    end
  end
end
