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

    # ## Getting Decision Tasks
    #
    # You can use #poll or #poll_for_single_task on {DecisionTaskCollection}
    # to grab a decision task:
    #
    #     # get a single task
    #     if task = domain.decision_tasks.poll_for_single_task('task-list')
    #       # make decisions
    #       task.complete!
    #     end
    #
    # See {DecisionTaskCollection} for more information on getting and
    # counting decision tasks.
    #
    # ## Exploring Event History
    #
    # Once you have a decision task you can examine the event history.
    # This can give you the information you need to make decisions.
    # The {#events} and {#new_events} methods enumerate through
    # all events or events since the last decision.
    #
    #     decision_task.new_events.each do |event|
    #       # inspect the #event_type and #attributes
    #     end
    #
    # Check out {HistoryEvent} for more information on working with
    # events.
    #
    # ## Making Decisions
    #
    # Based on the history of events, you should make decisions by calling
    # methods listed below.  You can call each method as many times as
    # you wish, until you have completed the decision task.
    #
    #  * {#schedule_activity_task}
    #  * {#request_cancel_activity_task}
    #
    #  * {#complete_workflow_execution}
    #  * {#cancel_workflow_execution}
    #  * {#fail_workflow_execution}
    #  * {#continue_as_new_workflow_execution}
    #
    #  * {#record_marker}
    #  * {#start_timer}
    #  * {#cancel_timer}
    #
    #  * {#signal_external_workflow_execution}
    #  * {#request_cancel_external_workflow_execution}
    #  * {#start_child_workflow_execution}
    #
    # The decision methods are grouped above by concern.
    #
    # ## Completing the Decision Task
    #
    # Once you have finished adding decisions to the task, you need to
    # complete it.  If you called {DecisionTaskCollection#poll} or
    # {DecisionTaskCollection#poll_for_single_task} with a block
    # argument then the decision will be completed automatically at the
    # end of the block.
    #
    #     domain.decision_tasks.poll do |decision_task|
    #       # ...
    #     end #=> the decision task is closed here
    #
    # If you get a task from {DecisionTaskCollection#poll_for_single_task}
    # without a block, then it is your responsibility to call {#complete!}
    # on the decision task.  If you fail to do this before the
    # task start to close timeout, then a decisionTaskTimedOut event
    # will be added to the workflow execution history.
    #
    class DecisionTask

      include Core::Model
      include OptionFormatters

      # @api private
      def initialize domain, request_options, data

        @domain = domain

        @request_options = request_options

        @task_token = data['taskToken']

        workflow_id = data['workflowExecution']['workflowId']
        run_id = data['workflowExecution']['runId']
        @workflow_execution = WorkflowExecution.new(domain, workflow_id, run_id)

        name = data['workflowType']['name']
        version = data['workflowType']['version']
        @workflow_type = WorkflowType.new(domain, name, version)

        @previous_started_event_id = data['previousStartedEventId']

        @started_event_id = data['startedEventId']

        @next_token = data['nextPageToken']

        @events = data['events']

        @decisions = []

        super

      end

      # @return [String] The decision task identifier.
      attr_reader :task_token

      # @return [Domain]
      attr_reader :domain

      # @return [WorkflowExecution]
      attr_reader :workflow_execution

      # @return [WorkflowType]
      attr_reader :workflow_type

      # @return [Integer] The id of the DecisionTaskStarted event of the
      #   previous decision task of this workflow execution that was
      #   processed by the decider. This can be used to determine the new
      #   events in the history new since the last decision task received
      #   by the decider.
      attr_reader :previous_started_event_id

      # @return [Integer] The id of the DecisionTaskStarted event recorded
      #   in the history.
      attr_reader :started_event_id

      # @return [String,nil] Returns a value if the results are paginated.
      #   Normally you do not need this value, as {#events} will enumerate
      #   all events, making requests as necessary to get more.
      attr_reader :next_token

      # @return [Enumerable] Returns an enumerable collection of all events
      #   for the workflow execution.
      def events
        enum_for(:_events)
      end

      # @return [Enumerable] Returns an enumerable collection of only the
      #   new events for workflow execution (since the last decision).
      def new_events
        enum_for(:_new_events)
      end

      # @param [Hash] options
      #
      # @option options [String] :execution_context (nil)  A user-defined
      #   context to add to the workflow execution.  You can fetch this
      #   later with {WorkflowExecution#latest_execution_context}.
      #
      # @return [nil]
      #
      def complete! options = {}

        raise 'already responded' if responded?

        options[:task_token] = task_token
        options[:decisions] = @decisions unless @decisions.empty?

        client.respond_decision_task_completed(options)

        @responded = true

        nil

      end

      # @return [Boolean] Returns true if {#complete!} has been called on
      #   this decision task.
      def responded?
        !!@responded
      end

      # Schedules an activity task.
      #
      # @note This adds a decision to this task that is finalized when you
      #   call {#complete!}.
      #
      # @param [ActivityType,Hash] activity_type The type of activity
      #   to schedule.  `activity_type` must be an {ActivityType} object
      #   or a hash with `:name` and `:version`.
      #
      # @param [Hash] options
      #
      # @option options [String] :control (nil) Optional data attached to
      #   the event that can be used by the decider in subsequent workflow
      #   tasks. This data is not sent to the activity.
      #
      # @option options [Integer,:none] :heartbeat_timeout (nil)
      #   The maximum time before which a worker processing a task
      #   of this type must report progress.  If the timeout is exceeded,
      #   the activity task is automatically timed out. If the worker
      #   subsequently attempts to record a heartbeat or returns a
      #   result, it will be ignored. This default can be overridden when
      #   scheduling an activity task.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :input (nil) Input provided to the
      #   activity task.
      #
      # @option options [Integer,:none] :schedule_to_close_timeout (nil)
      #   The maximum duration that a task of this activity type
      #   can wait before being assigned to a worker.
      #
      #   A schedule-to-close timeout for this activity task must be
      #   specified either as a default for the activity type or through
      #   this option. If neither this field is set nor a default was
      #   specified at registration time then a fault will be returned.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [Integer,:none] :schedule_to_start_timeout (nil)
      #   The maximum duration that a task of this activity type
      #   can wait before being assigned to a worker.  This overrides the
      #   default timeout specified when registering the activity type.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [Integer,:none] :start_to_close_timeout (nil)
      #   The maximum duration that a worker can take to process
      #   tasks of this activity type.  This overrides the default
      #   timeout specified when registering the activity type.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :task_list (nil)
      #   If set, specifies the name of the task list in which to schedule
      #   the activity task. If not specified, the default task list
      #   registered with the activity type will be used.
      #
      # @option options [Integer] :task_priority (nil)
      #   If set, specifies the value of the task priority at which to
      #   schedule the activity task. If not specified, the default task
      #   priority registered with the activity type will be used.
      #
      # @return [nil]
      #
      def schedule_activity_task activity_type, options = {}

        options[:activity_id] ||= SecureRandom.uuid

        options[:activity_type] = case activity_type
        when Hash
          unless
            activity_type[:name].is_a?(String) and
            activity_type[:version].is_a?(String) and
            activity_type.keys.length == 2
          then
            msg = 'activity_type hash must have :name and :version strings'
            raise ArgumentError, msg
          end
          activity_type
        when ActivityType
          { :name => activity_type.name, :version => activity_type.version }
        else
          msg = 'expected activity_type to be an ActivityType object or a hash'
          raise ArgumentError, msg
        end

        duration_opts(options,
          :heartbeat_timeout,
          :schedule_to_close_timeout,
          :schedule_to_start_timeout,
          :start_to_close_timeout)

        if priority = options[:task_priority]
          options[:task_priority] = priority.to_s
        end

        if task_list = options[:task_list]
          options[:task_list] = { :name => task_list }
        end

        add_decision :schedule_activity_task, options

      end

      # Attempts to cancel a previously scheduled activity task. If the
      # activity task was scheduled but has not been assigned to a worker,
      # then it will be canceled. If the activity task was already assigned
      # to a worker, then the worker will be informed that cancellation has
      # been requested when recording the activity task heartbeat.
      #
      # @param [ActivityTask,String] activity_or_activity_id An {ActivityTask}
      #   object or the activity_id of an activity task to request
      #   cancellation for.
      #
      # @return [nil]
      #
      def request_cancel_activity_task activity_or_activity_id

        id = activity_or_activity_id.is_a?(ActivityTask) ?
          activity_or_activity_id.activity_id :
          activity_or_activity_id

        add_decision :request_cancel_activity_task, { :activity_id => id }

      end

      # Closes the workflow execution and records a
      # WorkflowExecutionCompleted event in the history.
      #
      # @param [Hash] options
      #
      # @option options [String] :result (nil) The results of the workflow
      #   execution.
      #
      # @return [nil]
      #
      def complete_workflow_execution options = {}
        add_decision :complete_workflow_execution, options
      end

      # Closes the workflow execution and records a WorkflowExecutionFailed
      # event in the history.
      #
      # @param [Hash] options
      #
      # @option options [String] :reason (nil) Reason for the failure.
      #
      # @option options [String] :details (nil) Optional details of the failure.
      #
      # @return [nil]
      #
      def fail_workflow_execution options = {}
        add_decision :fail_workflow_execution, options
      end

      # Closes the workflow execution and records a
      # WorkflowExecutionCanceled event in the history.
      #
      # @param [Hash] options
      #
      # @option options [String] :details (nil) Optional details of the
      #   cancellation.
      #
      # @return [nil]
      #
      def cancel_workflow_execution options = {}
        add_decision :cancel_workflow_execution, options
      end

      # Closes the workflow execution and starts a new workflow execution
      # of the same type using the same workflow id and a unique run Id.
      # A WorkflowExecutionContinuedAsNew event is recorded in the history.
      #
      # @option options [String] :input (nil)
      #   The input for the workflow execution. This is a free form string
      #   which should be meaningful to the workflow you are starting.
      #   This input is made available to the new workflow execution in the
      #   WorkflowExecutionStarted history event.
      #
      # @option options [Array<string>] :tag_list ([])
      #   A list of tags (strings) to associate with the workflow execution.
      #   You can specify a maximum of 5 tags.
      #
      # @option options [Symbol] :child_policy (nil)
      #   Specifies the policy to use for the child workflow executions of
      #   this workflow execution if it is terminated explicitly or due to
      #   an expired timeout. This policy overrides the default child policy
      #   specified when registering the workflow type.  The supported child
      #   policies are:
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
      # @option options [Integer,:none] :execution_start_to_close_timeout (nil)
      #   The total duration for this workflow execution.  This overrides
      #   the default specified when registering the workflow type.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :task_list (nil)
      #   The task list to use for the decision tasks generated for this
      #   workflow execution. This overrides the default task list specified
      #   when registering the workflow type.
      #
      # @option options [Integer] :task_priority (nil)
      #   The task priority to use for the decision tasks generated for this
      #   workflow execution. This overrides the default task priority specified
      #   when registering the workflow type.
      #
      # @option options [Integer,:none] :task_start_to_close_timeout (nil)
      #   Specifies the maximum duration of decision tasks for this
      #   workflow execution. This parameter overrides the default
      #   specified when the workflow type was registered.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @return [nil]
      #
      def continue_as_new_workflow_execution options = {}
        start_execution_opts(options)
        add_decision :continue_as_new_workflow_execution, options
      end

      # Records a MarkerRecorded event in the history. Markers can be used
      # for adding custom information in the history for instance to let
      # deciders know that they do not need to look at the history beyond
      # the marker event.
      #
      # @param [String] marker_name The name of the marker.
      #
      # @param [Hash] options
      #
      # @option options [String] :details (nil) Optional details of the marker.
      #
      # @return [nil]
      #
      def record_marker marker_name, options = {}
        add_decision :record_marker, options.merge(:marker_name => marker_name)
      end

      # Schedules a timer for this workflow execution and records a
      # TimerScheduled event in the history. This timer will fire after
      # the specified delay and record a TimerFired event.
      #
      # @param [Integer] start_to_fire_timeout (nil) The duration to wait
      #   before firing the timer.
      #
      # @param [Hash] options
      #
      # @option options [String] :control (nil) Optional data attached to
      #   the event that can be used by the decider in subsequent workflow
      #   tasks.
      #
      # @option options [String] :timer_id (nil) Unique id for the timer.
      #   If you do not pass this option, a UUID will be generated.
      #
      # @return [String] Returns the id of the timer.
      #
      def start_timer start_to_fire_timeout, options = {}
        options[:timer_id] ||= SecureRandom.uuid
        options[:start_to_fire_timeout] = start_to_fire_timeout
        duration_opts(options, :start_to_fire_timeout)
        add_decision :start_timer, options
        options[:timer_id]
      end

      # Cancels a previously scheduled timer and records a TimerCanceled
      # event in the history.
      #
      # @param [String] timer_id The id of the timer to cancel.
      #
      # @return [nil]
      #
      def cancel_timer timer_id
        add_decision :cancel_timer, { :timer_id => timer_id }
      end

      # Requests a signal to be delivered to the specified external workflow
      # execution and records a SignalExternalWorkflowExecutionRequested
      # event in the history.
      #
      # @param [WorkflowExecution,String] workflow_execution
      #
      # @param [String] signal_name
      #
      # @param [Hash] options
      #
      # @option options [String] :control (nil) Optional data attached to
      #   the event that can be used by the decider in subsequent decision
      #   tasks.
      #
      # @option options [String] :input (nil) Optional input to be provided
      #   with the signal.  The target workflow execution will use the
      #   signal name and input to process the signal.
      #
      # @return [nil]
      #
      def signal_external_workflow_execution workflow_execution, signal_name, options = {}
        workflow_execution_opts(options, workflow_execution)
        options[:signal_name] = signal_name
        add_decision :signal_external_workflow_execution, options
      end

      # Requests that a request be made to cancel the specified external
      # workflow execution and records a
      # RequestCancelExternalWorkflowExecutionRequested event in
      # the history.
      #
      # @return [nil]
      #
      def request_cancel_external_workflow_execution workflow_execution, options = {}
        workflow_execution_opts(options, workflow_execution)
        add_decision :request_cancel_external_workflow_execution, options
      end

      # Requests that a child workflow execution be started and records a
      # StartChildWorkflowExecutionRequested event in the history.
      # The child workflow execution is a separate workflow execution with
      # its own history.
      #
      # @param [WorkflowType,Hash] workflow_type (nil) The type of
      #   workflow execution to start.  This should be a {WorkflowType} object
      #   or a hash with the keys `:name` and `:version`.
      #
      # @param [Hash] options
      #
      # @option (see WorkflowType#start_execution)
      #
      # @option options [String] :control (nil) Optional data attached to
      #   the event that can be used by the decider in subsequent workflow
      #   tasks.
      #
      # @return [String] Returns the workflow id of the new execution.
      #
      def start_child_workflow_execution workflow_type, options = {}
        start_execution_opts(options, workflow_type)
        add_decision :start_child_workflow_execution, options
        options[:workflow_id]
      end

      protected
      def workflow_execution_opts options, workflow_execution

       if workflow_execution.is_a?(WorkflowExecution)
          options[:workflow_id] = workflow_execution.workflow_id
          options[:run_id] = workflow_execution.run_id
        elsif
          workflow_execution.is_a?(Hash) and
          workflow_execution[:workflow_id].is_a?(String) and
          workflow_execution[:run_id].is_a?(String) and
          workflow_execution.keys.length == 2
        then
          options.merge!(workflow_execution)
        elsif workflow_execution.is_a?(String)
          options[:workflow_id] = workflow_execution
        else
          msg = 'expected workflow_execution to be a WorkflowExecution ' +
            'object or workflow id or a hash with :workflow_id and :run_id'
          raise ArgumentError, msg
        end

      end

      protected
      def add_decision decision_type, attributes
        @decisions << {
          :decision_type => Core::Inflection.class_name(decision_type.to_s),
          :"#{decision_type}_decision_attributes" => attributes,
        }
        nil
      end

      protected
      def _new_events &block
        _events do |event|
          yield(event) if event.new?
        end
      end

      protected
      def _events &block

        _each_event(@events, &block)
        next_token = self.next_token

        while next_token

          options = @request_options.merge(:next_page_token => next_token)
          response = client.poll_for_decision_task(options)

          _each_event(response.data['events'], &block)
          next_token = response.data['nextPageToken']

        end

      end

      def _each_event events, &block
        prev_event_id = self.previous_started_event_id
        events.each do |description|
          event = HistoryEvent.new(workflow_execution, description)
          Core::MetaUtils.extend_method(event, :new?) do
            prev_event_id.nil? or self.event_id > prev_event_id
          end
          yield(event)
        end
      end


    end
  end
end
