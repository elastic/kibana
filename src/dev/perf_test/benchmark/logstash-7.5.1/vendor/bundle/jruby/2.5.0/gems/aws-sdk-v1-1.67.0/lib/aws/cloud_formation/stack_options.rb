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
  class CloudFormation

    # This module provide option helpers for methods operation on stacks.
    # @api private
    module StackOptions

      protected

      def apply_stack_name stack_name, options
        options[:stack_name] = stack_name
      end

      def apply_template opts
        if template = opts.delete(:template)
          case template
          when String
            if template.match(/^http/)
              opts[:template_url] = template
            else
              opts[:template_body] = template
            end
          when URI then opts[:template_url] = template.to_s
          when S3::S3Object then opts[:template_body] = template.read
          else
            opts[:template_body] = template.to_json
          end
        end
      end

      def apply_disable_rollback options
        options[:disable_rollback] = options[:disable_rollback] == true
      end

      def apply_notification_arns options
        if arns = options.delete(:notify)
          options[:notification_arns] = Array(arns).collect do |topic|
            topic.is_a?(SNS::Topic) ? topic.arn : topic
          end
        end
      end

      def apply_parameters options
        if params = options[:parameters] and params.is_a?(Hash)
          options[:parameters] = params.inject([]) do |list,(key,value)|
            list << { :parameter_key => key.to_s, :parameter_value => value }
          end
        end
      end

      def apply_timeout options
        if timeout = options.delete(:timeout)
          options[:timeout_in_minutes] = timeout
        end
      end

    end
  end
end
