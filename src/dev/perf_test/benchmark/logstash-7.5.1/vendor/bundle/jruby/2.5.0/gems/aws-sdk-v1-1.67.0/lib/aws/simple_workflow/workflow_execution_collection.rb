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

require 'time'

module AWS
  class SimpleWorkflow

    # A collection that enumerates workflow executions.
    #
    #     domain.workflow_executions.each do |execution|
    #       # ...
    #     end
    #
    # ## Filtering Executions
    #
    # By default, all open workflow executions are enumerated.
    #
    class WorkflowExecutionCollection

      # @api private
      FILTERS = [
        :status,
        :workflow_type,
        :workflow_id,
        :tagged,
        :started_before,
        :started_after,
        :closed_before,
        :closed_after,
      ]

      include Core::Collection::WithLimitAndNextToken
      include OptionFormatters

      # @api private
      def initialize domain, options = {}

        @domain = domain

        @reverse_order = !!options[:reverse_order]

        @defaults = FILTERS.inject({}) do |defaults,opt|
          defaults[opt] = options[opt] if options.has_key?(opt)
          defaults
        end

        super

      end

      # @return [Domain] Returns the domain this execution was started in.
      attr_reader :domain

      # Returns the workflow execution with the given `workflow_id` and
      # `run_id`.
      #
      #     # get a reference to a single workflow execution
      #     domain.workflow_executions['workflow-id', 'run-id']
      #     domain.workflow_executions.at('workflow-id', 'run-id')
      #
      # @param [String] workflow_id The workflow execution id.
      #
      # @param [String] run_id The workflow execution run id.
      #
      # @return [WorkflowExecution
      #
      def at workflow_id, run_id
        WorkflowExecution.new(domain, workflow_id, run_id)
      end
      alias_method :[], :at

      # Records a WorkflowExecutionSignaled event in the workflow execution
      # history and creates a decision task for the workflow execution.
      #
      #     domain.signal_workflow_execution('workflowid', 'newdata', :input => '...')
      #
      # @param [String] workflow_id The id of the workflow execution to signal.
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
      # @option options [String] :run_id (nil) The run id of the workflow
      #   execution to signal.
      #
      #   If `:run_id` is not specified, then the WorkflowExecutionSignaled
      #   event is recorded in the history of the current open workflow
      #   with the matching workflow_id in the domain.
      #
      # @return [nil]
      #
      def signal workflow_id, signal_name, options = {}
        options[:domain] = domain.name
        options[:workflow_id] = workflow_id
        options[:signal_name] = signal_name
        client.signal_workflow_execution(options)
        nil
      end

      # Records a WorkflowExecutionCancelRequested event in the currently
      # running workflow execution identified. This logically requests
      # the cancellation of the workflow execution as a whole.
      # It is up to the decider to take appropriate actions when it receives
      # an execution history with this event.
      #
      # @note If the `:run_id` is not specified, the
      #   WorkflowExecutionCancelRequested event is recorded in the history
      #   of the current open workflow execution with the specified
      #   `workflow_id` in the domain.
      #
      # @note Because this action allows the workflow to properly clean up
      #   and gracefully close, it should be used instead of {#terminate}
      #   when possible.
      #
      # @param [String] workflow_id The id of the workflow execution to cancel.
      #
      # @param [Hash] options
      #
      # @option options [String] :run_id (nil) The run id of the workflow
      #   execution to cancel.
      #
      # @return [nil]
      #
      def request_cancel workflow_id, options = {}
        options[:domain] = domain.name
        options[:workflow_id] = workflow_id
        client.request_cancel_workflow_execution(options)
        nil
      end

      # Records a WorkflowExecutionTerminated event and forces closure of
      # the workflow execution identified. The child policy, registered
      # with the workflow type or specified when starting this execution,
      # is applied to any open child workflow executions of this workflow
      # execution.
      #
      # @note If the workflow execution was in progress, it is terminated
      #   immediately.
      #
      # @note If a `:run_id` is not specified, then the
      #   WorkflowExecutionTerminated event is recorded in the history of
      #   the current open workflow with the matching workflowId in the
      #   domain.
      #
      # @note You should consider canceling the workflow execution
      #   instead because it allows the workflow to gracefully close
      #   while terminate does not.
      #
      # @param [String] workflow_id
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
      # @option options [String] :details Optional details for
      #   terminating the workflow execution.
      #
      # @option options [String] :reason An optional descriptive
      #   reason for terminating the workflow execution.
      #
      # @option options [String] :run_id The run id of the workflow
      #   execution to terminate. If a `:run_id` is not provided, then a
      #   WorkflowExecutionTerminated event is recorded in the history of
      #   the current open workflow with the matching workflow id in the
      #   domain.
      #
      # @return [nil]
      #
      def terminate workflow_id, options = {}
        options[:domain] = domain.name
        options[:workflow_id] = workflow_id
        upcase_opts(options, :child_policy)
        client.terminate_workflow_execution(options)
        nil
      end

      # @param [Symbol] status Causes the returned collection to filter
      #   executions by the given status. Accepted statuses include:
      #
      #   * `:open`
      #   * `:closed`
      #   * `:completed`
      #   * `:failed`
      #   * `:canceled`
      #   * `:terminated`
      #   * `:continued_as_new`
      #   * `:timed_out`
      #
      #   If `:status` is anything besides `:open` or `:closed` then
      #   it may not be used in combination with `workflow_id`,
      #   `workflow_type` or `tagged`.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions of the given
      #   status.
      #
      def with_status status
        collection_with(:status => status)
      end

      # @param [String] workflow_id
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that have
      #   the given `workflow_id`.
      #
      def with_workflow_id workflow_id
        collection_with(:workflow_id => workflow_id)
      end

      # @param [WorkflowType,Hash] workflow_type Should be a {WorkflowType}
      #   object or a hash with `:name` and `:version` keys.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that have
      #   the given `workflow_type`.
      #
      def with_workflow_type workflow_type
        collection_with(:workflow_type => workflow_type)
      end

      # @param [String] tag A tag to filter workflow executions with.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that have
      #   the given `tag`.
      #
      def tagged tag
        collection_with(:tagged => tag)
      end

      # Filters workflow executions by their start date.
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] oldest_time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @param [Time,DateTime,Date,Integer,String] latest_time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that have start
      #   times that fall within the given range.
      #
      def started_between oldest_time, latest_time
        started_after(oldest_time).started_before(latest_time)
      end

      # Filters workflow executions by their start date.
      #
      #     # executions that started at least an hour ago
      #     domain.workflow_executions.started_before(Time.now - 3600)
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that started
      #   before the given time.
      #
      def started_before time
        collection_with(:started_before => time)
      end

      # Filters workflow executions by their start date.
      #
      #     # executions that started within the last hour
      #     domain.workflow_executions.started_after(Time.now - 3600)
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that started
      #   after the given time.
      #
      def started_after time
        collection_with(:started_after => time)
      end

      # Filters workflow executions by their close date.
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] oldest_time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @param [Time,DateTime,Date,Integer,String] latest_time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that closed
      #   between the given times.
      #
      def closed_between oldest_time, latest_time
        closed_after(oldest_time).closed_before(latest_time)
      end

      # Filters workflow executions by their close date.
      #
      #     # executions that closed more than an hour ago
      #     domain.workflow_executions.closed_before(Time.now - 3600)
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that closed
      #   before the given time.
      #
      def closed_before time
        collection_with(:closed_before => time)
      end

      # Filters workflow executions by their close date.
      #
      #     # executions that closed within the last hour
      #     domain.workflow_executions.closed_after(Time.now - 3600)
      #
      # @note It is not possible to filter by both start time and close time.
      #
      # @param [Time,DateTime,Date,Integer,String] time Should
      #   be one of the listed types.  Integers are treated as timestamps
      #   and strings are parsed by DateTime.
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that will only enumerate or count executions that closed
      #   after the given time.
      #
      def closed_after time
        collection_with(:closed_after => time)
      end

      # Returns a collection that enumerates workflow executions in reverse
      # chronological order.  By default executions are enumerated in
      # ascending order of their start or close time (ordered by
      # close time when filtered by #closed_between).
      #
      #     # get the latest execution
      #     execution = domain.workflow_executions.reverse_order.first
      #
      # @return [WorkflowExecutionCollection] Returns a collection
      #   that enumerates workflow executions in reverse order.
      #
      def reverse_order
        collection_with(:reverse_order => true)
      end

      # Returns the number of workflow executions within the domain that
      # meet the specified filtering criteria.  Counts can be truncated
      # so you should check the return value.
      #
      #     count = domain.workflow_executions.count
      #     puts(count.truncated? ? "#{count.to_i}+" : count.to_i)
      #
      # @note You may only pass one of the following options:
      #   `:workflow_id`, `:workflow_type`, `:tagged` or
      #   `:status` with a "closed" value (`:status` with `:open` is okay).
      #
      # @note This operation is eventually consistent. The results are best
      #   effort and may not exactly reflect recent updates and changes.
      #
      # @param [Hash] options
      #
      # @option options [Symbol] :status Filters workflow executions by the
      #   given status.  If status is not provided then it defaults to
      #   `:open` unless you pass `:closed_between` (then it defaults to
      #   `:closed`).
      #
      #   If `:status` is anything besides `:open` or `:closed` then
      #   it may not be passed with `:workflow_id`, `:workflow_type` or
      #   `:tagged`.
      #
      #   Accepted values for `:status` include:
      #
      #   * `:open`
      #   * `:closed`
      #   * `:completed`
      #   * `:failed`
      #   * `:canceled`
      #   * `:terminated`
      #   * `:continued_as_new`
      #   * `:timed_out`
      #
      # @option options [Time] :started_after Filters workflow executions
      #   down to those started after the given time.
      #
      #   You may pass `:started_after` with `:started_before`, but not with
      #   `:closed_after` or `:closed_before`.
      #
      # @option options [Time] :started_before Filters workflow executions
      #   down to those started before the given time.
      #
      #   You may pass `:started_after` with `:started_before`, but not with
      #   `:closed_after` or `:closed_before`.
      #
      # @option options [Time] :closed_after Filters workflow executions
      #   to those closed after the given time.
      #
      #   * You may pass `:closed_after` with `:closed_before`, but not with
      #     `:started_after` or `:started_before`.
      #
      #   * This option is invalid when counting or listing open executions.
      #
      # @option options [Time] :closed_before Filters workflow executions
      #   to those closed before the given time.
      #
      #   * You may pass `:closed_after` with `:closed_before`, but not with
      #     `:started_after` or `:started_before`.
      #
      #   * This option is invalid when counting or listing open executions.
      #
      # @option options [String] :workflow_id (nil) If specified, workflow
      #   executions are filtered by the provided workflow id.
      #
      # @option options [String] :tagged (nil) Filters workflow executions
      #   by the given tag.
      #
      # @option options [WorkflowType,Hash] :workflow_type (nil)
      #   Filters workflow executions with the given workflow type.
      #   `:workflow_type` can be a {WorkflowType} object or a hash with
      #   a workflow type `:name` and `:version`.
      #
      # @return [Count] Returns a possibly truncated count of
      #   workflow executions.
      #
      def count options = {}

        open_or_closed, client_opts = handle_options(options)

        client_method = :"count_#{open_or_closed}_workflow_executions"
        response = client.send(client_method, client_opts)
        Count.new(response.data['count'], response.data['truncated'])
      end

      # Enumerates workflow executions.
      # @note (see #count)
      # @param (see #count)
      # @option (see #count)
      # @option (see Core::Collection#each)
      # @option options [Boolean] :reverse_order Enumerates the workflow
      #   execution in reverse chronological order if `true`.  The date
      #   used will be the execution start time unless filtering by
      #   closed before/after (then it will sort by the closed time).
      # @return (see Core::Collection#each)
      def each options = {}
        super
      end

      protected
      def collection_with options = {}
        defaults = @defaults.merge(:reverse_order => @reverse_order)
        self.class.new(domain, defaults.merge(options))
      end

      protected
      def _each_item next_token, limit, options = {}, &block

        open_or_closed, client_opts = handle_options(options)

        client_method = :"list_#{open_or_closed}_workflow_executions"

        client_opts[:maximum_page_size] = limit if limit
        client_opts[:next_page_token] = next_token if next_token
        client_opts[:reverse_order] = @reverse_order unless
          client_opts.key?(:reverse_order)

        response = client.send(client_method, client_opts)
        response.data['executionInfos'].each do |desc|

          workflow_id = desc['execution']['workflowId']
          run_id = desc['execution']['runId']

          workflow_execution = WorkflowExecution.new_from(
            client_method, desc, domain, workflow_id, run_id)

          yield(workflow_execution)

        end

        response.data['nextPageToken']

      end

      protected
      def handle_options options

        options = @defaults.merge(options)

        options[:domain] = domain.name

        status = options.delete(:status)
        status ||= (options[:closed_after] or options[:closed_before]) ?
          :closed : :open

        case status
        when :open   then open_or_closed = :open
        when :closed then open_or_closed = :closed
        else
          open_or_closed = :closed
          options[:close_status_filter] = { :status => status.to_s.upcase }
        end

        time_filter(open_or_closed, options)

        if workflow_id = options.delete(:workflow_id)
          options[:execution_filter] = {}
          options[:execution_filter][:workflow_id] = workflow_id
        end

        if tag = options.delete(:tagged)
          options[:tag_filter] = {}
          options[:tag_filter][:tag] = tag
        end

        if type = options.delete(:workflow_type)
          if type.is_a?(WorkflowType)
            type = { :name => type.name, :version => type.version }
          end
          options[:type_filter] = type
        end

        [open_or_closed, options]

      end

      protected
      def time_filter open_or_closed, options

        early_2010 = Time.parse('2010-01-01').to_i

        [%w(start started), %w(close closed)].each do |mode, suffixed|

          after = options.delete(:"#{suffixed}_after")
          before = options.delete(:"#{suffixed}_before")

          next unless after or before

          time_filter = {}
          time_filter[:oldest_date] = to_timestamp(after || early_2010)
          time_filter[:latest_date] = to_timestamp(before) if before

          options[:"#{mode}_time_filter"] = time_filter

        end

        if options.key?(:start_time_filter) and options.key?(:close_time_filter)
          raise 'You may filter by execution start or close time but not both.'
        end

        if options.key?(:close_time_filter) and open_or_closed == :open
          raise 'Unable to filter by closed time for open workflow executions.'
        end

        # if the client does not filter by start or close time, then add
        # a default filter that should return "everything"
        unless options[:start_time_filter] or options[:close_time_filter]
          options[:start_time_filter] = { :oldest_date => early_2010 }
        end

      end

      protected
      def to_timestamp time
        case time
        when Integer then time
        when Time then time.to_i
        else Time.parse(time.to_s).to_i
        end
      end

    end
  end
end
