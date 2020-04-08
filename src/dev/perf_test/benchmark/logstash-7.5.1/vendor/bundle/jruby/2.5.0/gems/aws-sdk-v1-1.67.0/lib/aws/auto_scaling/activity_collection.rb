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

    # Allows you to enumerate Auto Scaling activities
    #
    # Enumerating ALL activities:
    #
    #     auto_scaling = AWS::AutoScaling.new
    #     auto_scaling.activities.each do |activity|
    #       # ...
    #     end
    #
    # Enumerating activities for a single Auto Scaling group:
    #
    #     group = auto_scaling.groups['group-name']
    #     group.activities.each do |activity|
    #       # ...
    #     end
    #
    # If you know the id of an activity you can get a reference to it:
    #
    #     activity = auto_scaling.activities['activity-id']
    class ActivityCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @group = options[:group]
        if @group
          super(@group, options)
        else
          super
        end
      end

      # @param [String] activity_id
      # @return [Activity]
      def [] activity_id
        Activity.new(activity_id, :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit
        options[:auto_scaling_group_name] = @group.name if @group

        resp = client.describe_scaling_activities(options)
        resp.activities.each do |details|

          activity = Activity.new_from(
            :describe_scaling_activities, details,
            details.activity_id, :config => config)

          yield(activity)

        end

        resp.data[:next_token]

      end

    end
  end
end
