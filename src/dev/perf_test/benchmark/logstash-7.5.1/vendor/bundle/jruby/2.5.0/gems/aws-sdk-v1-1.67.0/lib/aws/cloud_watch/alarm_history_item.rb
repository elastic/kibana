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
  class CloudWatch
    class AlarmHistoryItem

      # @api private
      def initialize options
        @alarm_name = options[:alarm_name]
        @history_data = options[:history_data]
        @history_item_type = options[:history_item_type]
        @history_summary = options[:history_summary]
        @timestamp = options[:timestamp]
      end

      # @return [String] The descriptive name for the alarm.
      attr_reader :alarm_name

      # @return [String] Machine-readable data about the alarm in JSON format.
      attr_reader :history_data

      alias_method :data, :history_data

      # @return [String] The type of alarm history item.
      attr_reader :history_item_type

      alias_method :type, :history_item_type

      # @return [String] A human-readable summary of the alarm history.
      attr_reader :history_summary

      alias_method :summary, :history_summary

      # @return [Time] The time stamp for the alarm history item.
      attr_reader :timestamp

    end
  end
end
