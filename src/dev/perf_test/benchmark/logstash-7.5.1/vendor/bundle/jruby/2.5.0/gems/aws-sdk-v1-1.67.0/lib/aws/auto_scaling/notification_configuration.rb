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
  class AutoScaling
    class NotificationConfiguration

      # @api private
      def initialize auto_scaling_group, topic_arn, notification_types = []
        @group = auto_scaling_group
        @topic_arn = topic_arn
        @notification_types = notification_types
      end

      # @return [Group]
      attr_reader :group

      alias_method :auto_scaling_group, :group

      # @return [String]
      attr_reader :topic_arn

      # @return [Arra<String>]
      attr_reader :notification_types

      # @return [SNS::Topic]
      def topic
        SNS::Topic.new(topic_arn, :config => group.config)
      end

      # Updates the notification configuration with a new list of types:
      #
      #     config = auto_scaling_group.notification_configurations.first
      #     config.notification_types = %w(autoscaling:EC2_INSTANCE_LAUNCH)
      #
      # @return [nil]
      #
      def notification_types= *notification_types

        client_opts = {}
        client_opts[:topic_arn] = topic_arn
        client_opts[:notification_types] = notification_types.flatten
        client_opts[:auto_scaling_group_name] = group.name

        group.client.put_notification_configuration(client_opts)

        @notification_types = notification_types.flatten

        nil

      end

      # Deletes this Auto Scaling notification configuration.
      # @return [nil]
      def delete

        client_opts = {}
        client_opts[:auto_scaling_group_name] = group.name
        client_opts[:topic_arn] = topic_arn

        group.client.delete_notification_configuration(client_opts)

        nil

      end

      # @api private
      def eql? other
        other.is_a?(NotificationConfiguration) and
        other.group == group and
        other.topic_arn == topic_arn and
        other.notification_types == notification_types
      end

      alias_method :==, :eql?

    end
  end
end
