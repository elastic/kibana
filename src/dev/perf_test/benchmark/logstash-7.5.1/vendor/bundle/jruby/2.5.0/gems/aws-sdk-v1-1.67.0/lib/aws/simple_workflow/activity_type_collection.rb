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
    class ActivityTypeCollection < TypeCollection

      # Registers a new activity type along with its configuration settings
      # in the current domain.
      #
      # @param [String] name The name of the activity type.
      #
      # @param [String] version The version of the activity type.
      #   The activity type consists of the name and version, the
      #   combination of which must be unique within the domain.
      #
      # @param [Hash] options
      #
      # @option options [Integer,:none] :default_task_heartbeat_timeout (nil)
      #   The default maximum time before which a worker processing a task
      #   of this type must report progress.  If the timeout is exceeded,
      #   the activity task is automatically timed out. If the worker
      #   subsequently attempts to record a heartbeat or returns a
      #   result, it will be ignored. This default can be overridden when
      #   scheduling an activity task.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :default_task_list (nil) The default task
      #   list to use for scheduling tasks of this activity type.
      #   This default task list is used if a task list is not provided
      #   when a task is scheduled.
      #
      # @option options [Integer] :default_task_priority (nil) Specifies
      #   the default task priority to use for scheduling tasks for this
      #   activity type. This default is used only if a task priority is
      #   not provided when a task is scheduled.
      #
      # @option options [Integer,:none] :default_task_schedule_to_close_timeout (nil)
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [Integer,:none] :default_task_schedule_to_start_timeout (nil)
      #   The default maximum duration that a task of this activity type
      #   can wait before being assigned to a worker. This default can be
      #   overridden when scheduling an activity task.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [Integer,:none] :default_task_start_to_close_timeout (nil)
      #   The default maximum duration that a worker can take to process
      #   tasks of this activity type (in the ISO 8601 format). This default
      #   can be overridden when scheduling an activity task.
      #
      #   The value should be a number of seconds (integer) or the symbol
      #   `:none` (implying no timeout).
      #
      # @option options [String] :description (nil) A textual description
      #   of the activity type.
      #
      def register name, version, options = {}

        options[:domain] = domain.name
        options[:name] = name
        options[:version] = version

        duration_opts(options,
          :default_task_heartbeat_timeout,
          :default_task_schedule_to_close_timeout,
          :default_task_schedule_to_start_timeout,
          :default_task_start_to_close_timeout)

        if priority = options[:default_task_priority]
          options[:default_task_priority] = priority.to_s
        end

        if task_list = options[:default_task_list]
          options[:default_task_list] = { :name => task_list.to_s }
        end

        client.register_activity_type(options)

        self[name, version]

      end
      alias_method :create, :register

    end
  end
end
