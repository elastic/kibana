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
require 'aws/auto_scaling/config'

module AWS

  # This class is the starting point for working with Auto Scaling.
  #
  # To use Auto Scaling you must first
  # [sign up here](http://aws.amazon.com/autoscaling/).
  #
  # For more information about Auto Scaling:
  #
  # * [Auto Scaling](http://aws.amazon.com/autoscaling/)
  # * [Auto Scaling Documentation](http://aws.amazon.com/documentation/autoscaling/)
  #
  # # Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the AWS::AutoScaling interface:
  #
  #     auto_scaling = AWS::AutoScaling.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Launch Configurations
  #
  # You need to create a launch configuration before you can create
  # an Auto Scaling Group.
  #
  #     # needs a name, image id, and instance type
  #     launch_config = auto_scaling.launch_configurations.create(
  #       'launch-config-name', 'ami-12345', 'm1.small')
  #
  # If you have previously created a launch configuration you can
  # reference using the {LaunchConfigurationCollection}.
  #
  #     launch_config = auto_scaling.launch_configurations['launch-config-name']
  #
  # # Auto Scaling Groups
  #
  # Given a launch configuration, you can now create an Auto Scaling {Group}.
  #
  #     group = auto_scaling.groups.create('group-name',
  #       :launch_configuration => launch_config,
  #       :availability_zones => %w(us-west-2a us-west-2b),
  #       :min_size => 1,
  #       :max_size => 4)
  #
  # @!attribute [r] client
  #   @return [Client] the low-level AutoScaling client object
  class AutoScaling

    autoload :Activity, 'aws/auto_scaling/activity'
    autoload :ActivityCollection, 'aws/auto_scaling/activity_collection'
    autoload :Client, 'aws/auto_scaling/client'
    autoload :Errors, 'aws/auto_scaling/errors'
    autoload :Group, 'aws/auto_scaling/group'
    autoload :GroupCollection, 'aws/auto_scaling/group_collection'
    autoload :GroupOptions, 'aws/auto_scaling/group_options'
    autoload :Instance, 'aws/auto_scaling/instance'
    autoload :InstanceCollection, 'aws/auto_scaling/instance_collection'
    autoload :LaunchConfiguration, 'aws/auto_scaling/launch_configuration'
    autoload :LaunchConfigurationCollection, 'aws/auto_scaling/launch_configuration_collection'
    autoload :NotificationConfiguration, 'aws/auto_scaling/notification_configuration'
    autoload :NotificationConfigurationCollection, 'aws/auto_scaling/notification_configuration_collection'
    autoload :ScalingPolicy, 'aws/auto_scaling/scaling_policy'
    autoload :ScalingPolicyCollection, 'aws/auto_scaling/scaling_policy_collection'
    autoload :ScalingPolicyOptions, 'aws/auto_scaling/scaling_policy_options'
    autoload :ScheduledAction, 'aws/auto_scaling/scheduled_action'
    autoload :ScheduledActionCollection, 'aws/auto_scaling/scheduled_action_collection'
    autoload :Tag, 'aws/auto_scaling/tag'
    autoload :TagCollection, 'aws/auto_scaling/tag_collection'

    include Core::ServiceInterface

    endpoint_prefix 'autoscaling'

    # @return [LaunchConfigurationCollection]
    def launch_configurations
      LaunchConfigurationCollection.new(:config => config)
    end

    # @return [GroupCollection]
    def groups
      GroupCollection.new(:config => config)
    end

    # @return [TagCollection]
    def tags
      TagCollection.new(:config => config)
    end

    # @return [NotificationConfigurationCollection]
    def notification_configurations
      NotificationConfigurationCollection.new(:config => config)
    end

    # @return [AutoScaling::InstancesCollection] Returns a collection of
    #   {AutoScaling::Instance} objects.  Each of these is a small
    #   wrapper around an {EC2::Instance} with additional attributes.
    def instances
      InstanceCollection.new(:config => config)
    end

    # @return [ActivityCollection]
    def activities
      ActivityCollection.new(:config => config)
    end

    # @return [ScheduledActionCollection]
    def scheduled_actions
      ScheduledActionCollection.new(:config => config)
    end

    # Returns a list of all notification types that are supported by
    # Auto Scaling.
    # @return [Array<String>]
    def notification_types
      resp = client.describe_auto_scaling_notification_types
      resp.auto_scaling_notification_types
    end

    # @return [Array<String>] Returns the list of valid adjustment types.
    def adjustment_types
      client.describe_adjustment_types.adjustment_types.map(&:adjustment_type)
    end

    # @return [Array<String>] Returns the list of valid scaling process types.
    def scaling_process_types
      client.describe_scaling_process_types.processes.map(&:process_name)
    end

    # @return [Array<String>] Returns the list of valid metric collection types.
    def metric_collection_types
      client.describe_metric_collection_types.metrics.map(&:metric)
    end

    # @return [Array<String>] Returns the list of valid metric granularities.
    def metric_collection_granularities
      client.describe_metric_collection_types.granularities.map(&:granularity)
    end

  end
end
