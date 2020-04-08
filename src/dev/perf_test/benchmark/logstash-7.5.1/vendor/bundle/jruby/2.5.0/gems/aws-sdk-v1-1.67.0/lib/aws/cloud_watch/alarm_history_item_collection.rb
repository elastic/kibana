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

require 'date'
require 'time'

module AWS
  class CloudWatch
    class AlarmHistoryItemCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # @param [String,Symbol] name
      # @param [String] value
      # @return [AlarmHistoryItemCollection]
      def filter name, value
        filters = @filters.merge(name.to_s.to_sym => value)
        AlarmHistoryItemCollection.new(:filters => filters, :config => config)
      end

      # @param [String] name
      # @return [AlarmHistoryItemCollection]
      def with_alarm_name name
        filter(:alarm_name, name)
      end

      # @param [Time,DateTime,String<ISO8601>] date
      # @return [AlarmHistoryItemCollection]
      def with_start_date date
        date = date.iso8601 if date.respond_to?(:iso8601)
        filter(:start_date, date)
      end

      # @param [Time,DateTime,String<ISO8601>] date
      # @return [AlarmHistoryItemCollection]
      def with_end_date date
        date = date.iso8601 if date.respond_to?(:iso8601)
        filter(:end_date, date)
      end

      # @param [String] type
      # @return [AlarmHistoryItemCollection]
      def with_type type
        filter(:history_item_type, type)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options = @filters.merge(options)
        options[:max_records] = limit if limit
        options[:next_token] = next_token if next_token

        resp = client.describe_alarm_history(options)
        resp.data[:alarm_history_items].each do |details|

          yield(AlarmHistoryItem.new(details))

        end

       resp.data[:next_token]

      end

    end
  end
end
