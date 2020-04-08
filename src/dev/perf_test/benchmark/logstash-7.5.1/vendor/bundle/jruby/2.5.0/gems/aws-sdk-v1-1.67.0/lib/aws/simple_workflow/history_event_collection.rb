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

    # This collection represents the history events ({HistoryEvent}) for a
    # single workflow execution.
    #
    # See {Core::Collection} for documentation on the standard enumerable
    # methods and their options.
    #
    class HistoryEventCollection

      include Core::Collection::WithLimitAndNextToken

      # @param [WorkflowExecution] workflow_execution The execution this
      #   history event belongs to.
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :reverse_order (false) When true,
      #   history events are enumerated in reverse chronological order.
      #
      def initialize workflow_execution, options = {}
        @workflow_execution = workflow_execution
        @reverse_order = options.key?(:reverse_order) ?
          !!options[:reverse_order] : false
        super
      end

      # @return [WorkflowExecution]
      attr_reader :workflow_execution

      # @return [WorkflowExecutionCollection] Returns a collection that
      #   enumerates workflow executions in reverse order.
      def reverse_order
        self.class.new(workflow_execution, :reverse_order => true)
      end

      protected
      def _each_item next_token, limit, options = {}, &block

        options[:domain] = workflow_execution.domain.name
        options[:execution] = {
          :workflow_id => workflow_execution.workflow_id,
          :run_id => workflow_execution.run_id,
        }
        options[:maximum_page_size] = limit if limit
        options[:next_page_token] = next_token if next_token
        options[:reverse_order] = @reverse_order unless
          options.has_key?(:reverse_order)

        response = client.get_workflow_execution_history(options)
        response.data['events'].each do |desc|
          event = HistoryEvent.new(workflow_execution, desc)
          yield(event)
        end

        response.data['nextPageToken']

      end

    end
  end
end
