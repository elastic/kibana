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

require 'socket'

module AWS
  class SimpleWorkflow

    # @api private
    module OptionFormatters

      protected
      def identity_opt options
        options[:identity] || "#{Socket.gethostname}:#{Process.pid}"
      end

      protected
      def upcase_opts options, *opt_names
        opt_names.each do |opt|
          if options.has_key?(opt)
            options[opt] = options[opt].to_s.upcase
          end
        end
      end

      protected
      def duration_opts options, *opt_names
        opt_names.each do |opt|
          options[opt] = options[opt].to_s.upcase if options[opt]
        end
      end

      def start_execution_opts options, workflow_type = nil

        if workflow_type

          options[:workflow_id] ||= SecureRandom.uuid

          if workflow_type.is_a?(WorkflowType)
            options[:workflow_type] = {}
            options[:workflow_type][:name] = workflow_type.name
            options[:workflow_type][:version] = workflow_type.version
          elsif
            workflow_type.is_a?(Hash) and
            workflow_type[:name].is_a?(String) and
            workflow_type[:version] .is_a?(String)and
            workflow_type.keys.length == 2
          then
            options[:workflow_type] = workflow_type
          else
            msg = "expected workflow_type to be a WorkflowType object or " +
              "a hash with :name and :version"
            raise ArgumentError, msg
          end

        end

        upcase_opts(options, :child_policy)

        duration_opts(options,
          :execution_start_to_close_timeout,
          :task_start_to_close_timeout)

        if priority = options[:task_priority]
          options[:task_priority] = priority.to_s
        end

        if options.has_key?(:task_list)
          options[:task_list] = { :name => options[:task_list].to_s }
        end

      end

    end
  end
end
