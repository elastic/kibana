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

    # ## Registering an ActivityType
    #
    # To register an activity type you should use the #activity_types method
    # on the domain:
    #
    #     domain.activity_types.register('name', 'version', { ... })
    #
    # See {ActivityTypeCollection#register} for a complete list of options.
    #
    # ## Deprecating an activity type
    #
    # ActivityType inherits from the generic {Type} base class.  Defined in
    # {Type} are a few useful methods including:
    #
    # * {Type#deprecate}
    # * {Type#deprecated?}
    #
    # You can use these to deprecate an activity type:
    #
    #     domain.activity_types['name','version'].deprecate
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
    # @attr_reader [Integer,:none,nil] default_task_heartbeat_timeout
    #   The default maximum time specified when registering the activity
    #   type, before which a worker processing a task must report
    #   progress. If the timeout is exceeded, the activity task is
    #   automatically timed out. If the worker subsequently attempts
    #   to record a heartbeat or return a result, it will be ignored.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    # @attr_reader [String,nil] default_task_list
    #   The default task list specified for this activity type at
    #   registration. This default task list is used if a task list is
    #   not provided when a task is scheduled.
    #
    # @attr_reader [Integer,nil] default_task_priority
    #   The default priority specified for this activity type at registration.
    #   This default task priority is used if a task priority is not provided
    #   when a task is scheduled.
    #
    # @attr_reader [Integer,:none,nil] default_task_schedule_to_close_timeout
    #   The default maximum duration specified when registering the
    #   activity type, for tasks of this activity type. You can override
    #   this default when scheduling a task.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    # @attr_reader [Integer,:none,nil] default_task_schedule_to_start_timeout
    #   The optional default maximum duration specified when registering
    #   the activity type, that a task of an activity type can wait
    #   before being assigned to a worker.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    # @attr_reader [Integer,:none,nil] default_task_start_to_close_timeout
    #   The default maximum duration for activity tasks of this type.
    #
    #   The return value may be an integer (number of seconds), the
    #   symbol `:none` (implying no timeout) or `nil` (not specified).
    #
    class ActivityType < Type

      type_attribute :creation_date, :timestamp => true

      type_attribute :deprecation_date, :timestamp => true, :static => false

      type_attribute :description

      type_attribute :status, :to_sym => true, :static => false

      config_attribute :default_task_heartbeat_timeout, :duration => true

      config_attribute :default_task_list do
        translates_output {|v| v['name'] }
      end

      config_attribute :default_task_priority do
        translates_output {|v| v.to_i }
      end

      config_attribute :default_task_schedule_to_close_timeout, :duration => true

      config_attribute :default_task_schedule_to_start_timeout, :duration => true

      config_attribute :default_task_start_to_close_timeout, :duration => true

      # list activity type only provides type attributes
      provider(:list_activity_types) do |provider|
        provider.provides *type_attributes.keys
        provider.find do |resp|
          desc = resp.data['typeInfos'].find do |info|
            info[self.class.type_key] == { 'name' => name, 'version' => version }
          end
        end
      end

      # describe activity type provides type and config attributes
      provider(:describe_activity_type) do |provider|
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
