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

require 'aws/core'
require 'aws/simple_workflow/config'

module AWS

  # This is the starting point for working with Amazon Simple Workflow Service.
  #
  # # Domains
  #
  # To get started, you need to first create a domain.  Domains are used to
  # organize related tasks and activities.
  #
  #     swf = AWS::SimpleWorkflow.new
  #
  #     # name the domain and specify the retention period (in days)
  #     domain = swf.domains.create('my-domain', 10)
  #
  # You can reference existing domains as well.
  #
  #     domain = swf.domains['my-domain']
  #
  # # Workflow and Activity Types
  #
  # Once you have a domain you can create a workflow and
  # activity types.  Both types (workflow and activity) are templates that
  # can be used to start workflow executions or schedule activity tasks.
  #
  # Workflow and Activity types both have a number of default values
  # (e.g. default task list, timeouts, etc).  If you do not specify these
  # optional default values when creating the type, you *MUST* specify
  # the actual values when starting a workflow execution or scheduling
  # an activity task.
  #
  # ## Sample Workflow type and activity type
  #
  #     # register an workflow type with the version id '1'
  #     workflow_type = domain.workflow_types.create('my-long-processes', '1',
  #       :default_task_list => 'my-task-list',
  #       :default_child_policy => :request_cancel,
  #       :default_task_start_to_close_timeout => 3600,
  #       :default_execution_start_to_close_timeout => 24 * 3600)
  #
  #     # register an activity type, with the version id '1'
  #     activity_type = domain.activity_types.create('do-something', '1',
  #       :default_task_list => 'my-task-list',
  #       :default_task_heartbeat_timeout => 900,
  #       :default_task_schedule_to_start_timeout => 60,
  #       :default_task_schedule_to_close_timeout => 3660,
  #       :default_task_start_to_close_timeout => 3600)
  #
  # # Starting a Workflow Execution
  #
  # Once you have a domain and at least one workflow type you can
  # start a workflow execution.  You may provide a workflow id, or a
  # random one will be generated.  You may also provide optional
  # input and override any of the defaults registered with the
  # workflow type.
  #
  #     workflow_execution = workflow_type.start_execution :input => '...'
  #
  #     workflow_execution.workflow_id #=> "5abbdd75-70c7-4af3-a324-742cd29267c2"
  #     workflow_execution.run_id #=> "325a8c34-d133-479e-9ecf-5a61286d165f"
  #
  # # Decision Tasks
  #
  # Once a workflow execution has been started, it will start to generate
  # decision tasks.  You poll for decision tasks from a task list.
  # Yielded decision tasks provide access to the history of events
  # for the workflow execution.  You can also enumerate only new
  # events since the last decision.
  #
  # To make decisions you call methods from the list below.  You can call
  # any number of decision methods any number of times.
  #
  # * schedule_activity_task
  # * request_cancel_activity_task
  # * complete_workflow_execution
  # * fail_workflow_execution
  # * cancel_workflow_execution
  # * continue_as_new_workflow_execution
  # * record_marker
  # * start_timer
  # * cancel_timer
  # * signal_external_workflow_execution
  # * request_cancel_external_workflow_execution workflow_execution, options = {}
  # * start_child_workflow_execution workflow_type, options = {}
  #
  # This sample gets a decision task and responds based on the events
  # by scheduling an activity task or completing the workflow execution.
  #
  #     # poll for decision tasks from 'my-task-list'
  #     domain.decision_tasks.poll('my-task-list') do |task|
  #
  #       # investigate new events and make decisions
  #       task.new_events.each do |event|
  #         case event.event_type
  #         when 'WorkflowExecutionStarted'
  #           task.schedule_activity_task 'do-something', :input => 'abc xyz'
  #         when 'ActivityTaskCompleted'
  #           task.complete_workflow_execution :result => event.attributes.result
  #         end
  #       end
  #
  #     end # decision task is completed here
  #
  # When you are done calling decision methods, you need to complete the
  # decision task.  This is done by default if you pass a block to
  # `poll` or `poll_for_single_task`.
  #
  # # Activity Tasks
  #
  # The only way to spawn activity tasks is to call `schedule_activity_task`
  # on a decision task.  Scheduled activity tasks are returned when you
  # poll for activity tasks.
  #
  #     # poll 'my-task-list' for activities
  #     domain.activity_tasks.poll('my-task-list') do |activity_task|
  #
  #       case activity_task.activity_type.name
  #       when 'do-something'
  #         # ...
  #       else
  #         activity_task.fail! :reason => 'unknown activity task type'
  #       end
  #
  #     end
  #
  # ## Activity Task Heartbeats
  #
  # When you receive an activity task, you need to update the service
  # with status messages.  This is called recording a heartbeat.#
  # To record a heartbeat, just call {ActivityTask#record_heartbeat!}.
  # When you call `record_heartbeat` you should rescue
  # {ActivityTask::CancelRequestedError}.  These are thrown when a task
  # should be canceled.  You can cleanup the task and then call
  # `cancel!` when you are finished.
  #
  #     # poll 'my-task-list' for activities
  #     domain.activity_tasks.poll('my-task-list') do |activity_task|
  #       begin
  #
  #         # do stuff ...
  #
  #         activity_task.record_heartbeat! :details => '25%'
  #
  #         # do more stuff ...
  #
  #         activity_task.record_heartbeat! :details => '50%'
  #
  #         # do more stuff ...
  #
  #         activity_task.record_heartbeat! :details => '75%'
  #
  #         # do more stuff ...
  #
  #       rescue ActivityTask::CancelRequestedError
  #         # cleanup after ourselves
  #         activity_task.cancel!
  #       end
  #     end
  #
  # Like decision tasks, activity tasks are auto-completed at the
  # end of a poll block.
  #
  # # History Events
  #
  # You might want to view the event history for a running workflow
  # execution.  You can get a workflow execution by its workflow
  # id (you may optionally provide the run id as well).
  #
  #     execution = domain.workflow_executions['workflow-id', 'run-id']
  #     execution.events.each do |event|
  #       puts event.attributes.to_h.inspect
  #     end
  #
  # See {HistoryEvent} and {HistoryEvent::Attributes} for more information.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level SimpleWorkflow client object
  class SimpleWorkflow

    autoload :ActivityType, 'aws/simple_workflow/activity_type'
    autoload :ActivityTypeCollection, 'aws/simple_workflow/activity_type_collection'
    autoload :ActivityTask, 'aws/simple_workflow/activity_task'
    autoload :ActivityTaskCollection, 'aws/simple_workflow/activity_task_collection'
    autoload :Client, 'aws/simple_workflow/client'
    autoload :Count, 'aws/simple_workflow/count'
    autoload :DecisionTask, 'aws/simple_workflow/decision_task'
    autoload :DecisionTaskCollection, 'aws/simple_workflow/decision_task_collection'
    autoload :Domain, 'aws/simple_workflow/domain'
    autoload :DomainCollection, 'aws/simple_workflow/domain_collection'
    autoload :Errors, 'aws/simple_workflow/errors'
    autoload :HistoryEvent, 'aws/simple_workflow/history_event'
    autoload :HistoryEventCollection, 'aws/simple_workflow/history_event_collection'
    autoload :OptionFormatters, 'aws/simple_workflow/option_formatters'
    autoload :Resource, 'aws/simple_workflow/resource'
    autoload :Type, 'aws/simple_workflow/type'
    autoload :TypeCollection, 'aws/simple_workflow/type_collection'
    autoload :WorkflowExecution, 'aws/simple_workflow/workflow_execution'
    autoload :WorkflowExecutionCollection, 'aws/simple_workflow/workflow_execution_collection'
    autoload :WorkflowType, 'aws/simple_workflow/workflow_type'
    autoload :WorkflowTypeCollection, 'aws/simple_workflow/workflow_type_collection'

    include Core::ServiceInterface

    endpoint_prefix 'swf'

    # @return [DomainCollection]
    def domains
      DomainCollection.new(:config => config)
    end

  end
end
