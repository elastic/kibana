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

    class ActivityTaskCollection

      include Core::Model
      include OptionFormatters

      # @api private
      def initialize domain, options = {}
        @domain = domain
        super
      end

      # @return [Domain]
      attr_reader :domain

      # Returns the number of tasks in the specified `task_list`.
      #
      #     count = activity_tasks.count('task-list-name')
      #     count.truncated? #=> false
      #     count.to_i #=> 7
      #
      # @note This operation is eventually consistent. The results are best
      #   effort and may not exactly reflect recent updates and changes.
      #
      # @param [String] task_list The name of the task list.
      #
      # @return [Count] Returns a possibly truncated count of
      #   pending activity tasks for the given `task_list`.
      #
      def count task_list
        options = {}
        options[:domain] = domain.name
        options[:task_list] = { :name => task_list }
        response = client.count_pending_activity_tasks(options)
        Count.new(response.data['count'], response.data['truncated'])
      end

      # @param [String] task_list The task list to check for pending
      #   activity tasks in.
      #
      # @param [Hash] options
      #
      # @option options [String] :identity (nil) Identity of the worker
      #   making the request, which is recorded in the ActivityTaskStarted
      #   event in the workflow history. This enables diagnostic tracing
      #   when problems arise. The :identity defaults to the hostname and
      #   pid (e.g. "hostname:pid").
      #
      # @yieldparam [ActivityTask] activity_task Yields if a task is
      #   available within 60 seconds.
      #
      # @return [ActivityTask,nil] Returns an activity task when one is
      #    available, `nil` otherwise.  If you call this function with
      #    a block, `nil` is always returned.
      #
      def poll_for_single_task task_list, options = {}, &block

        client_opts = {}
        client_opts[:domain] = domain.name
        client_opts[:task_list] = { :name => task_list }
        client_opts[:identity] = identity_opt(options)

        response = client.poll_for_activity_task(client_opts)

        if response.data['taskToken']
          activity_task = ActivityTask.new(domain, response.data)
          if block_given?
            begin
              yield(activity_task)
              activity_task.complete! unless activity_task.responded?
            rescue ActivityTask::CancelRequestedError
              activity_task.cancel! unless activity_task.responded?
            rescue StandardError => e
              unless activity_task.responded?
                reason = "UNTRAPPED ERROR: #{e.message}"
                details = e.backtrace.join("\n")
                activity_task.fail!(:reason => reason, :details => details)
              end
              raise e
            end
            nil
          else
            activity_task
          end
        else
          nil
        end

      end

      def poll task_list, options = {}, &block
        loop do
          begin
            poll_for_single_task(task_list, options) do |activity_task|
              yield(activity_task)
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
