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

    # @attr_reader [Symbol] child_policy The policy to use for the child
    #   workflow executions if this workflow execution is terminated.
    #   The return value will be one of the following values:
    #
    #   * `:terminate` - the child executions will be terminated.
    #   * `:request_cancel` - a request to cancel will be attempted for each
    #     child execution by recording a WorkflowExecutionCancelRequested
    #     event in its history. It is up to the decider to take appropriate
    #     actions when it receives an execution history with this event.
    #   * `:abandon` - no action will be taken. The child executions will
    #     continue to run.
    #
    # @attr_reader [String] start_to_close_timeout The total allowed
    #   duration for this workflow execution.
    #
    #   The return value will be formatted as an ISO 8601 duration (e.g.
    #   'PnYnMnDTnHnMnS').
    #
    # @attr_reader [String] task_list The task list used for the decision
    #   tasks generated for this workflow execution.
    #
    # @attr_reader [String] task_priority The task priority used for the decision
    #   tasks generated for this workflow execution.
    #
    # @attr_reader [String] task_start_to_close_timeout The maximum duration
    #   allowed for decision tasks for this workflow execution.
    #
    #   The return value will be formatted as an ISO 8601 duration (e.g.
    #   'PnYnMnDTnHnMnS').
    #
    # @attr_reader [Time,nil] closed_at The time when the workflow execution
    #   was closed.  Returns nil if this execution is not closed.
    #
    # @attr_reader [Time] started_at The time when the execution was started.
    #
    # @attr_reader [Time,nil] latest_activity_task_scheduled_at The time
    #   when the last activity task was scheduled for this workflow execution.
    #   You can use this information to determine if the workflow has not
    #   made progress for an unusually long period of time and might
    #   require a corrective action.
    #
    # @attr_reader [String,nil] latest_execution_context The latest execution
    #   context provided by the decider for this workflow execution. A decider
    #   can provide an execution context, which is a free form string, when
    #   closing a decision task.
    #
    # @attr_reader [Hash] open_counts Returns a hash of counts, including:
    #   `:open_timers`, `:open_child_workflow_executions`, `:open_decision_tasks`,
    #   and `:open_activity_tasks`.
    #
    class WorkflowExecution < Resource

      def initialize domain, workflow_id, run_id, options = {}
        @domain = domain
        @workflow_id = workflow_id
        @run_id = run_id
        super
      end

      # @return [Domain] The domain this workflow execution was started in.
      attr_reader :domain

      # @return [String] The workflow id of this execution.
      attr_reader :workflow_id

      # @return [String] The run id of this execution.
      attr_reader :run_id

      config_attribute :child_policy, :to_sym => true

      config_attribute :execution_start_to_close_timeout, :duration => true

      config_attribute :task_list do
        translates_output{|v| v['name'] }
      end

      config_attribute :task_priority do
        translates_output{|v| v.to_i }
      end

      config_attribute :task_start_to_close_timeout, :duration => true

      info_attribute :cancel_requested

      info_attribute :close_status, :to_sym => true
      protected :close_status

      info_attribute :closed_at, :from => 'closeTimestamp', :timestamp => true

      info_attribute :execution_status, :to_sym => true
      protected :execution_status

      info_attribute :parent_details, :from => 'parent', :static => true
      protected :parent_details

      info_attribute :started_at,
        :from => 'startTimestamp',
        :timestamp => true,
        :static => true

      info_attribute :tag_list, :static => true
      protected :tag_list

      info_attribute :type_details, :from => 'workflowType', :static => true
      protected :type_details

      attribute :latest_activity_task_scheduled_at,
        :from => 'latestActivityTaskTimestamp',
        :timestamp => true

      attribute :latest_execution_context

      attribute :open_counts do
        translates_output do |hash|
          hash.inject({}) do |h,(k,v)|
            h[Core::Inflection.ruby_name(k).to_sym] = v; h
          end
        end
      end

      # list_workflow_executions provides ONLY type attributes
      provider(
        :list_open_workflow_executions,
        :list_closed_workflow_executions
      ) do |provider|
        provider.provides *info_attributes.keys
        provider.find do |resp|
          execution = { 'workflowId' => workflow_id, 'runId' => run_id }
          resp.data['executionInfos'].find do |desc|
            desc['execution'] == execution
          end
        end
      end

      # describe_workflow_execution provides ALL attributes
      provider(:describe_workflow_execution) do |provider|
        provider.provides *attributes.keys
        provider.find do |resp|
          execution = { 'workflowId' => workflow_id, 'runId' => run_id }
          d = resp.data
          if d['executionInfo']['execution'] == execution
            d.merge(d['executionInfo']).merge(d['executionConfiguration'])
          else
            nil
          end
        end
      end

      # @return [Symbol] Returns the status of this execution. Possible
      #   return values are:
      #
      #   * `:open` - The execution is still running.
      #   * `:completed` - The execution was successfully completed.
      #   * `:canceled` - The execution was canceled, cancellation allows
      #      the implementation to gracefully clean up before the execution
      #      is closed.
      #   * `:failed` - The execution failed to complete.
      #     and was automatically timed out.
      #   * `:continued_as_new` - The execution is logically continued. This
      #     means the current execution was completed and a new execution
      #     was started to carry on the workflow.
      #   * `:terminated` - The execution was force terminated.
      #   * `:timed_out` - The execution did not complete in the allotted
      #     time and was automatically timed out.
      #
      def status
        AWS.memoize do
          execution_status == :open ? :open : (close_status || :closed)
        end
      end

      # @return [Boolean] Returns true if a request was made to cancel
      #   this workflow execution.
      def cancel_requested?
        cancel_requested
      end

      # @return [Boolean] Returns true if the workflow execution is still open.
      def open?
        status == :open
      end

      # @return [Boolean] Returns true if the workflow execution is closed.
      def closed?
        !open?
      end

      # @return [Boolean] Returns true if this workflow execution has an
      #   open decision task.
      def open_child_workflow_execution_count
        open_counts[:open_child_workflow_executions]
      end

      # @return [Integer] Returns the number of open activity tasks.
      def open_activity_task_count
        open_counts[:open_activity_tasks]
      end

      # @return [Integer] Returns the number of open timers.
      def open_timer_count
        open_counts[:open_timers]
      end

      # @return [Integer] Returns the number of closed activity tasks.
      def open_decision_task_count
        open_counts[:open_decision_tasks]
      end

      # @return [Array<String>] Returns an array of tags assigned to this
      #   execution.
      def tags
        tag_list || []
      end

      # @return [HistoryEventCollection] Returns a collection that enumerates
      #   history events for this workflow execution.
      def history_events
        HistoryEventCollection.new(self)
      end
      alias_method :events, :history_events

      # @return [WorkflowType] Returns the type of this workflow execution.
      def workflow_type
        type = self.type_details
        WorkflowType.new(domain, type['name'], type['version'])
      end

      # @return [WorkflowExecution,nil] Returns the parent workflow execution
      #   (if there is one).
      def parent
        if parent = self.parent_details
          domain.workflow_executions[parent['workflowId'],parent['runId']]
        else
          nil
        end
      end

      # Records a WorkflowExecutionSignaled event in the workflow execution
      # history and creates a decision task for the workflow execution.
      #
      #     workflow_execution.signal('signal_name', :input => '...')
      #
      # @param [String] signal_name The name of the signal. This name must be
      #   meaningful to the target workflow.
      #
      # @param [Hash] options
      #
      # @option options [String] :input (nil) Data to attach to the
      #   WorkflowExecutionSignaled event in the target workflow
      #   execution's history.
      #
      # @return [nil]
      #
      def signal signal_name, options = {}
        options[:run_id] = run_id
        domain.workflow_executions.signal(workflow_id, signal_name, options)
      end

      # Records a WorkflowExecutionCancelRequested event in the currently
      # running workflow execution. This logically requests the cancellation
      # of the workflow execution as a whole. It is up to the decider to
      # take appropriate actions when it receives an execution history
      # with this event.
      #
      # @note Because this action allows the workflow to properly clean up
      #   and gracefully close, it should be used instead of {#terminate}
      #   when possible.
      #
      # @return [nil]
      #
      def request_cancel
        options = { :run_id => run_id }
        domain.workflow_executions.request_cancel(workflow_id, options)
      end

      # Records a WorkflowExecutionTerminated event and forces closure of
      # the workflow execution. The child policy, registered with the
      # workflow type or specified when starting this execution, is applied
      # to any open child workflow executions of this workflow execution.
      #
      # @note If the workflow execution was in progress, it is terminated
      #   immediately.
      #
      # @note You should consider canceling the workflow execution
      #   instead because it allows the workflow to gracefully close
      #   while terminate does not.
      #
      # @param [Hash] options
      #
      # @option options [Symbol] :child_policy (nil)
      #   If set, specifies the policy to use for the child workflow
      #   executions of the workflow execution being terminated. This
      #   policy overrides the default child policy.  Valid policies include:
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
      # @option options [String] :details (nil) Optional details for
      #   terminating the workflow execution.
      #
      # @option options [String] :reason (nil) An optional descriptive
      #   reason for terminating the workflow execution.
      #
      # @return [nil]
      #
      def terminate options = {}
        options[:run_id] = run_id
        domain.workflow_executions.terminate(workflow_id, options)
      end

      # Counts the number of executions that share the same workflow id.
      #
      # @note See {WorkflowExecutionCollection#count} for a broader count.
      #
      # @note This operation is eventually consistent. The results are best
      #   effort and may not exactly reflect recent updates and changes.
      #
      # @param [Hash] options
      #
      # @option options [Symbol] :status (:open) Specifies that
      #   status of the workflow executions to count. Defaults to
      #   open workflows.
      #
      #   * `:open`
      #   * `:closed`
      #
      # @option options [Array<Time>] :started_between A start and end time
      #   to filter workflow execution start times by.  You may pass an
      #   array with two time values or a range.  Times should be
      #   timestamps (integers), Time, Date, DateTime or parseable time
      #   strings.
      #
      #   You may not pass both `:started_between` and `:closed_between`.
      #
      # @option options [Array<Time>] :closed_between A start and end time
      #   to filter workflow execution closed times by.  You may pass an
      #   array with two time values or a range.  Times should be
      #   timestamps (integers), Time, Date, DateTime or parseable time
      #   strings.
      #
      #   You may not pass both `:started_between` and `:closed_between`.
      #   You may also not pass `:closed_between` if the `:status` is
      #   `:open`.
      #
      # @return [Integer] Returns the count of executions that share
      #   workflow id with the current execution.
      #
      def count_executions options = {}
        options[:workflow_id] = workflow_id
        domain.workflow_executions.count(options)
      end

      protected
      def resource_identifiers
        [[:domain,domain.name], [:workflow_id,workflow_id], [:run_id,run_id]]
      end

      protected
      def resource_options
        {
          :domain => domain.name,
          :execution => { :workflow_id => workflow_id, :run_id => run_id },
        }
      end

    end
  end
end
