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
    class ActivityTask

      # Raised by {ActivityTask#record_heartbeat!} when this activity
      # task has received a cancellation request.
      class CancelRequestedError < StandardError; end

      include Core::Model

      # @api private
      def initialize domain, data, options = {}

        @domain = domain

        @task_token = data['taskToken']
        @activity_id = data['activityId']
        @started_event_id = data['startedEventId']
        @input = data['input']

        name = data['activityType']['name']
        version = data['activityType']['version']
        @activity_type = domain.activity_types[name,version]

        workflow_id = data['workflowExecution']['workflowId']
        run_id = data['workflowExecution']['runId']
        @workflow_execution = domain.workflow_executions[workflow_id,run_id]

        super

      end

      # @return [String] The opaque string used as a handle on the task.
      attr_reader :task_token

      # @return [String] The unique identifier of this task.
      attr_reader :activity_id

      # @return [Domain] The domain this task was scheduled in.
      attr_reader :domain

      # @return [Integer]
      #   The id of the {ActivityTaskStarted} event recorded in the history.
      attr_reader :started_event_id

      # @return [String,nil] The input provided when the activity task was
      #   scheduled.
      attr_reader :input

      # @return [ActivityType]
      attr_reader :activity_type

      # @return [WorkflowExecution]
      attr_reader :workflow_execution

      # Reports to the service that the activity task is progressing.
      #
      # You can optionally specify `:details` that describe the progress.
      # This might be a percentage competition, step number, etc.
      #
      #     activity_task.record_heartbeat! :details => '.75' # 75% complete
      #
      # If the activity task has been canceled since it was received or
      # since the last recorded heartbeat, this method will raise
      # a CancelRequestedError.
      #
      # If you are processing the activity task inside a block passed
      # to one of the polling methods in {ActivityTaskCollection}
      # then untrapped CancelRequestedErrors are caught
      # and responded to automatically.
      #
      #     domain.activity_tasks.poll('task-list') do |task|
      #       task.record_heartbeat! # raises CancelRequestedError
      #     end # traps the error and responds activity task canceled.
      #
      # If you need to cleanup or provide additional details in the
      # cancellation response, you can trap the error and
      # respond manually.
      #
      #     domain.activity_tasks.poll('task-list') do |task|
      #       task.record_heartbeat! # raises CancelRequestedError
      #     rescue CancelRequestedError => e
      #        # cleanup
      #        task.respond_canceled! :details => '...'
      #     end
      #
      # @param [Hash] options
      #
      # @option options [String] :details (nil)
      #   If specified, contains details about the progress of the task.
      #
      def record_heartbeat! options = {}

        client_opts = {}
        client_opts[:task_token] = task_token
        client_opts[:details] = options[:details] if options[:details]

        response = client.record_activity_task_heartbeat(client_opts)

        raise CancelRequestedError if response.data['cancelRequested']

        nil

      end

      # @param [Hash] options
      #
      # @option options [String] :result (nil)
      #
      # @return [nil]
      #
      def complete! options = {}
        respond :completed, options
      end

      # @param [Hash] options
      #
      # @option options [String] :details (nil)
      #
      # @return [nil]
      #
      def cancel! options = {}
        respond :canceled, options
      end

      # @param [Hash] options
      #
      # @option options [String] :details (nil)
      #
      # @option options [String] :reason (nil)
      #
      # @return [nil]
      #
      def fail! options = {}
        respond :failed, options
      end

      def responded?
        !!@responded
      end

      # Responds to one of the `respond_activity_task_` methods with a set of options. This method is called when any
      # of the {#complete!}, {#cancel!}, or {#fail!} methods is invoked.
      #
      # @note Only one response can be logged per `ActivityTask` instance; If this task has already logged a response,
      #   `respond` will raise an exception.
      #
      # @param [String] status
      #   The status of the response: "canceled", "completed", or "failed".
      #
      # @param [Hash] options
      #   Options to provide to the respond_activity_task function that will be called.
      #
      protected
      def respond status, options
        raise "already responded" if responded?
        @responded = status
        options[:task_token] = task_token
        client.send("respond_activity_task_#{status}", options)
        nil
      end

    end
  end
end
