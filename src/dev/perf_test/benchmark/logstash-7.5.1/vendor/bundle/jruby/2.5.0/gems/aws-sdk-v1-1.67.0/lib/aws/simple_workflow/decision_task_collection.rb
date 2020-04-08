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

require 'timeout'

module AWS
  class SimpleWorkflow

    # Provides an interface to count, and receive decision tasks
    # ({DecisionTask} objects) from the service.
    #
    # ## Counting
    #
    # To get a count of decision tasks needing attention, call {#count}
    # with a task list name:
    #
    #     domain.decision_tasks.count('my-task-list').to_i #=> 7
    #
    # ## Getting a single decision task
    #
    # To process a single task use {#poll_for_single_task}:
    #
    #     domain.decision_tasks.poll_for_single_task('my-task-list') do |task|
    #       # this block is yielded to only if a task is found
    #       # within 60 seconds.
    #     end
    #
    # At the end of the block, the decision task is auto-completed.
    # If you prefer you can omit the block and `nil` or a {DecisionTask}
    # will be returned.
    #
    #     if task = domain.decision_tasks.poll_for_single_task('my-task-list')
    #       # you need to call complete! or the decision task will time out
    #       task.complete!
    #     end
    #
    # ## Polling for Tasks in a Loop
    #
    # You can poll indefinitely for tasks in a loop with {#poll}:
    #
    #     domain.decision_tasks.poll('my-task-list') do |task|
    #       # yields once for every decision task found
    #     end
    #
    # Just like the block form above, the decision task is auto completed at
    # the end of the block.  Please note, if you call `break` or `return`
    # from inside the block, you *MUST* call {DecisionTask#complete!} or
    # the task will timeout.
    #
    # ## Events and Decisions
    #
    # Each decision task provides an enumerable collection of both
    # new events ({DecisionTask#new_events}) and all events
    # ({DecisionTask#events}).
    #
    # Based on the events in the workflow execution history, you should
    # call methods on the decision task.  See {DecisionTask} for
    # a complete list of decision methods.
    #
    class DecisionTaskCollection

      include Core::Model
      include OptionFormatters

      # @api private
      def initialize domain, options = {}
        @domain = domain
        super
      end

      # @return [Domain]
      attr_reader :domain

      # Returns the number of decision tasks in the specified `task_list`.
      #
      #     count = decision_tasks.count('task-list-name')
      #     count.truncated? #=> false
      #     count.to_i #=> 7
      #
      # @note This operation is eventually consistent. The results are best
      #   effort and may not exactly reflect recent updates and changes.
      #
      # @param [String] task_list Name of the task list to count
      #   decision tasks for.
      #
      # @return [Count] Returns a {Count} object that specifies the number
      #   of decision tasks for the given task list.  This count will
      #   also indicate if the count was truncated.
      #
      def count task_list
        options = {}
        options[:domain] = domain.name
        options[:task_list] = { :name => task_list }
        response = client.count_pending_decision_tasks(options)
        Count.new(response.data['count'], response.data['truncated'])
      end

      # Polls the service for a single decision task.  The service may
      # hold the request for up to 60 seconds before responding.
      #
      #     # try to get a single task, may return nil when no tasks available
      #     task = domain.decision_tasks.poll_for_single_task('task-list')
      #     if task
      #       # make decisions ...
      #       task.complete!
      #     end
      #
      # You can optionally pass a block and that will only be yielded
      # to when a decision task is available within the 60 seconds.
      #
      #     domain.decision_tasks.poll_for_single_task('task-list') do |task|
      #        # make decisions
      #        # task.complete! is called for you at the end of the block
      #     end
      #
      # With the block form you do not need to call #complete! on the
      # decision task.  It will be called when the block exists.
      #
      # @note If you are not using the block form you must call
      #   {DecisionTask#complete!} yourself or your decision task will
      #   timeout.
      #
      # @param [String] task_list Specifies the task list to poll for
      #   decision tasks.
      #
      # @param [Hash] options
      #
      # @option options [String] :identity The identity of the decider
      #   requesting a decision task.  This will be recorded in the
      #   DecisionTaskStarted event in the workflow history.
      #   If `:identity` is not passed then the hostname and
      #   process id will be sent (e.g. "hostname:pid").
      #
      # @option options [Boolean] :reverse_event_order (false)  When true,
      #   the history events on the decision task will enumerate in
      #   reverse chronological order (newest events first).  By default
      #   the events are enumerated in chronological order (oldest first).
      #
      # @option options [Integer] :event_batch_size (1000) When enumerating
      #   events on the decision task, multiple requests may be required
      #   to fetch all of the events.  You can specify the maximum number
      #   of events to request each time (must not be greater than 1000).
      #
      # @yieldparam [DecisionTask] decision_task
      #
      # @return [DecisionTask,nil] Returns a decision task or `nil`.  If
      #   a block was passed then `nil` is always returned.  If a block
      #   is not passed, then `nil` or a {DecisionTask} will be returned.
      #
      def poll_for_single_task task_list, options = {}, &block

        client_opts = {}
        client_opts[:domain] = domain.name
        client_opts[:identity] = identity_opt(options)
        client_opts[:task_list] = { :name => task_list }
        client_opts[:maximum_page_size] = options[:event_batch_size] || 1000
        client_opts[:reverse_order] = options.key?(:reverse_event_order) ?
          options[:reverse_event_order] : false

        response = client.poll_for_decision_task(client_opts)

        if response.data['taskToken']
          decision_task = DecisionTask.new(domain, client_opts, response.data)
          if block_given?
            yield(decision_task)
            decision_task.complete! unless decision_task.responded?
            nil
          else
            decision_task
          end
        else
          nil
        end

      end

      # Polls indefinitely for decision tasks.  Each decision task found is
      # yielded to the block.  At the end of the block the decision task
      # is auto-completed ({DecisionTask#complete!} is called).
      #
      #     # yields once for each decision task found, indefinitely
      #     domain.decision_tasks.poll do |decision_task|
      #       # make decisions here
      #     end
      #
      # @note If you to terminate the block (by calling `break` or `return`)
      #   then it is your responsibility to call #complete! on the decision
      #   task.
      #
      # @param (see #poll_for_single_task)
      #
      # @option (see #poll_for_single_task)
      #
      # @yieldparam [DecisionTask] decision_task
      #
      # @return [nil]
      #
      def poll task_list, options = {}, &block
        loop do
          begin
            poll_for_single_task(task_list, options) do |decision_task|
              yield(decision_task)
            end
          rescue Timeout::Error
            retry
          end
        end
        nil
      end

    end
  end
end
