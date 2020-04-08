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

require 'json'

module AWS
  class SimpleWorkflow

    # ## Getting History Events
    #
    # History events belong to workflow executions.  You can get them
    # from an execution two ways:
    #
    # * By enumerating events from the execution
    #
    #       workflow_execution.events.each do |event|
    #         # ...
    #       end
    #
    # * By enumerating events from the context of a {DecisionTask}:
    #
    #       workflow_execution.decision_tasks.poll do |decision_task|
    #         decision_task.events.each do |event|
    #         end
    #       end
    #
    # ## History Event Attributes
    #
    # All history events respond to the following 4 methods:
    #
    # * {#event_type}
    # * {#event_id}
    # * {#created_at}
    # * {#attributes}
    #
    # For a complete list of event types and a complete list of attributes
    # returned with each event type, see the service API documentation.
    #
    # Because the service returns attributes with camelCase name the
    # structure returned by {#attributes} allows you to access attributes
    # by their snake_case name or their camelCase name:
    #
    #     event.attributes.workflow_type
    #     event.attributes['workflowType']
    #
    # See {HistoryEvent::Attributes} for more information about working
    # with the returned attributes.
    #
    class HistoryEvent

      include Core::Model

      # @param [WorkflowExecution] workflow_execution
      #
      # @param [Hash,String] details A hash or JSON string describing
      #   the history event.
      #
      def initialize workflow_execution, details

        @workflow_execution = workflow_execution
        @details = details.is_a?(String) ? JSON.parse(details) : details
        @event_type = @details['eventType']
        @event_id = @details['eventId']
        @created_at = Time.at(@details['eventTimestamp'])

        attributes_key = "#{event_type}EventAttributes"
        attributes_key[0] = attributes_key[0,1].downcase
        attribute_data = @details[attributes_key] || {}
        @attributes = Attributes.new(workflow_execution, attribute_data)

        super

      end

      # @return [WorkflowExecution] The workflow execution this history
      #   event belongs to.
      attr_reader :workflow_execution

      # @return [String] Returns the name of the history event type.
      attr_reader :event_type

      # @return [Integer] Returns the event id.
      attr_reader :event_id
      alias_method :id, :event_id

      # @return [Time] When the event history was created.
      attr_reader :created_at

      # @return [Attributes] Returns an object that provides hash-like
      #   access to the history event attributes.
      attr_reader :attributes

      # @return [Hash] Returns a hash representation of the event.
      def to_h
        {
          :event_type => event_type,
          :event_id => event_id,
          :created_at => created_at,
          :attributes => attributes.to_h,
        }
      end

      # @return [String] Returns a JSON representation of this workflow
      #   execution.
      def to_json
        @details.to_json
      end

      # @api private
      def inspect
        "<#{self.class.name} #{to_h.inspect}>"
      end

      # A collection off attributes that provides method and hash style
      # access to a collection of attributes.
      #
      # If you are exploring a history event, you can call {#keys} to get
      # a complete list of attribute names present.  You can also reference
      # the service API documentation that lists all history event types
      # along with their returned attributes.
      #
      # ## Indifferent Access
      #
      # Here are a few examples showing the different ways to access an
      # attribute:
      #
      #     event = workflow_executions.events.first
      #
      #     # equivalent
      #     event.attributes.task_list
      #     event.attributes[:task_list]
      #     event.attributes['task_list']
      #     event.attributes['taskList']
      #
      # As shown in the example above keys and method names can be
      # snake_cased or camelCased (strings or symbols).
      #
      # ## Special Attributes
      #
      # The following list of attributes are treated specially.  Generally this
      # means they return
      #
      # * timeout attributes (e.g. taskStartToCloseTimeout) are returned as
      #   integers (number of seconds) or the special symbol :none, implying
      #   there is no timeout.
      #
      # * childPolicy is cast to a symbol
      #
      # * activityType is returned as a {ActivityType} object.
      #
      # * workflowType is returned as a {WorkflowType} object.
      #
      # * workflowExecution is returned as a {WorkflowExecution} object.
      #
      # * taskList is returned as a string, not a hash.
      #
      # * taskPriority is returned as an Integer, not a String.
      #
      class Attributes

        # @api private
        def initialize workflow_execution, data
          @workflow_execution = workflow_execution
          @data = data
        end

        # @param [String,Symbol] key
        # @return Returns the attribute with the given name (key).
        def [] key
          key = _camel_case(key)
          if @data.key?(key)
            _cast(key, @data[key])
          else
            msg = "no such attribute `#{key}`, valid keys are #{_key_string}"
            raise ArgumentError, msg
          end
        end

        # @return [Array<Symbol>] Returns a list of valid keys for this
        #   set of attributes.
        def keys
          @data.keys.collect{|key| _snake_case(key) }
        end

        # @return [Boolean] Returns true if the attribute with the given
        #   name is set.
        def key? key
          @data.key?(_camel_case(key))
        end
        alias_method :member?,  :key?
        alias_method :include?, :key?
        alias_method :has_key?, :key?

        # (see {#[]})
        def method_missing method
          self[method]
        end

        # @return [Hash] Returns all of the attributes in a hash with
        #   snaked_cased and symbolized keys.
        def to_h
          @data.inject({}) do |h,(key,value)|
            value = _cast(key,value)
            if value.is_a?(Array)
              value = value.map{|v| v.is_a?(Attributes) ? v.to_h : v }
            end
            h[_snake_case(key)] = value.is_a?(Attributes) ? value.to_h : value
            h
          end
        end

        # @api private
        def inspect
          "<Attributes #{to_h.inspect}>"
        end

        protected
        def _key_string
          keys.map(&:inspect).join(', ')
        end

        protected
        def _cast key, value
          case key
          when /Timeout$/
            value.to_s =~ /^\d+$/ ? value.to_i : value.downcase.to_sym
          when 'taskList'
            value['name']
          when 'taskPriority'
            value.to_i
          when 'childPolicy'
            value.downcase.to_sym
          when 'activityType'
            name = value['name']
            version = value['version']
            @workflow_execution.domain.activity_types[name,version]
          when 'workflowType'
            name = value['name']
            version = value['version']
            @workflow_execution.domain.workflow_types[name,version]
          when 'workflowExecution'
            workflow_id = value['workflowId']
            run_id = value['runId']
            @workflow_execution.domain.workflow_executions[workflow_id, run_id]
          else
            case value
            when Array then value.collect{|v| _cast(key,v) }
            when Hash then Attributes.new(@workflow_execution, value)
            else value
            end
          end
        end

        protected
        def _snake_case key
          Core::Inflection.ruby_name(key.to_s).to_sym
        end

        protected
        def _camel_case key
          key = key.to_s.split(/_/).collect{|k| k[0] = k[0,1].upcase; k}.join
          key[0] = key[0,1].downcase
          key
        end

      end

    end
  end
end
