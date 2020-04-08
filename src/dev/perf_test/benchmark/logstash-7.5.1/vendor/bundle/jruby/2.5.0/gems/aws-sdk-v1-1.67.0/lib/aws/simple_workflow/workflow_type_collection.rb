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

    class WorkflowTypeCollection < TypeCollection

      # Registers a new workflow type and its configuration settings for
      # in the current domain.
      #
      # @param [String] name The name of the workflow type.
      #
      # @param [String] version The version of the workflow type.
      #   The workflow type consists of the name and version, the
      #   combination of which must be unique within the domain.
      #
      # @param [Hash] options
      #
      # @option options [Symbol] :default_child_policy (nil) Specifies the default
      #   policy to use for the child workflow executions when a workflow
      #   execution of this type is terminated.  This default can be
      #   overridden when starting a workflow execution. The supported child
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
      # @option options [Integer,:none] :default_execution_start_to_close_timeout (nil)
      #   The default maximum duration for executions of this workflow type.
      #   You can override this default when starting an execution.
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :default_task_list (nil) Specifies
      #   the default task list to use for scheduling decision tasks for
      #   executions of this workflow type. This default is used only if
      #   a task list is not provided when starting the workflow execution.
      #
      # @option options [Integer] :default_task_priority (nil) Specifies
      #   the default task priority to use for scheduling decision tasks for
      #   executions of this workflow type. This default is used only if
      #   a task priority is not provided when starting the workflow execution.
      #
      # @option options [Integer,:none] :default_task_start_to_close_timeout (nil)
      #   The default maximum duration of decision tasks for this workflow type.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :description (nil) Textual description of
      #   the workflow type.
      #
      def register name, version, options = {}

        options[:domain] = domain.name
        options[:name] = name
        options[:version] = version

        upcase_opts(options, :default_child_policy)

        duration_opts(options,
          :default_execution_start_to_close_timeout,
          :default_task_start_to_close_timeout)

        if priority = options[:default_task_priority]
          options[:default_task_priority] = priority.to_s
        end

        if task_list = options[:default_task_list]
          options[:default_task_list] = { :name => task_list.to_s }
        end

        client.register_workflow_type(options)

        self[name, version]

      end
      alias_method :create, :register

    end
  end
end
