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

    # Provides a helper method for parsing scaling policy options.
    # @api private
    module ScalingPolicyOptions

      protected

      # @param [Hash] options
      #
      # @option options [required,String] :adjustment_type Specifies whether
      #   the adjustment is an absolute number or a percentage of the current
      #   capacity.  Valid values are:
      #
      #     * 'ChangeInCapacity'
      #     * 'ExactCapacity'
      #     * 'PercentChangeInCapacity'
      #
      # @option options [required,Integer] :scaling_adjustment The number of
      #   instances by which to scale. `:adjustment_type` determines the
      #   interpretation of this umber (e.g., as an absolute number or as a
      #   percentage of the existing Auto Scaling group size). A positive
      #   increment adds to the current capacity and a negative value
      #   removes from the current capacity.
      #
      # @option options [Integer] :cooldown The amount of time, in seconds,
      #   after a scaling activity completes before any further
      #   trigger-related scaling activities can start.
      #
      # @option options [Integer] :min_adjustment_step
      #
      # @return [Hash]
      #
      def scaling_policy_options auto_scaling_group, policy_name, options
        opts = {}
        opts[:auto_scaling_group_name] = auto_scaling_group.name
        opts[:policy_name] = policy_name
        [
          :cooldown,
          :adjustment_type,
          :scaling_adjustment,
          :min_adjustment_step,
        ].each do |opt|
          opts[opt] = options[opt] if options.key?(opt)
        end
        opts
      end

    end
  end
end
