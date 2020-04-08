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

    # Allows you to enumerate and create notification configurations.#
    #
    # ## Enumerating Notification Configurations
    #
    # You can enumerated *ALL* configurations from the AWS::AutoScaling class.
    #
    #     auto_scaling = AWS::AutoScaling.new
    #     auto_scaling.notification_configurations.each do |config|
    #       # ...
    #     end
    #
    # You can also limit them to a single Auto Scaling group:
    #
    #     group = auto_scaling.groups['group-name']
    #     group.notification_configurations.each do |config|
    #       # ...
    #     end
    #
    # ## Creating Notification Configurations
    #
    # You can create a notification configuration like so:
    #
    #     auto_scaling.notification_configurations.create(
    #       :group => 'auto-scaling-group-name',
    #       :topic => 'sns-topic-arn')
    #
    # Just like with enumeration, you can create them from the Auto
    # Scaling group:
    #
    #     group.notification_configurations.create(:topic => 'sns-topic-arn')
    class NotificationConfigurationCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @group = options[:group]
        if @group
          super(@group, options)
        else
          super(options)
        end
      end

      # @return [Group,nil] If this collection was initialized with
      #  an Auto Scaling group, then that group is returned, nil otherwise.
      attr_reader :group

      alias_method :auto_scaling_group, :group

      # Creates a new notification configuration. To create a notification
      # configuration you need an {SNS::Topic} and an Auto Scaling {Group}.
      #
      #     auto_scaling.notification_configurations.create(
      #       :group => 'auto-scaling-group-name',
      #       :topic => 'sns-topic-arn')
      #
      # You can also create notification configurations from an Auto Scaling
      # group and omit the `:group` option.
      #
      #     auto_scaling_group.notification_configurations.create(
      #       :topic => 'sns-topic-arn')
      #
      # You may also pass a list of notification types to publish to the
      # topic.  If you omit this option, then all notification types
      # will be configured.
      #
      #     # publish only these two specific notification types
      #     auto_scaling_group.notification_configurations.create(
      #       :topic => 'sns-topic-arn',
      #       :types => [
      #         'autoscaling:EC2_INSTANCE_LAUNCH',
      #         'autoscaling:EC2_INSTANCE_TERMINATE',
      #       ]
      #     )
      #
      # @param [Hash] options
      #
      # @option options [required,SNS::Topic,String] :topic An {SNS::Topic}
      #   object or a topic arn string.  Notifications will be published
      #   to this topic.
      #
      # @option options [Group,String] :group An Auto Scaling {Group} object
      #   or the name of an Auto Scaling group.  This is required if you
      #   this collection is not scoped by a {Group}.
      #
      # @option options [Array<String>] :types A list of notification
      #   types that should publish messages to the given topic.
      #
      # @return [NotificationConfiguration]
      #
      def create options = {}

        topic_arn = options[:topic].is_a?(SNS::Topic) ?
          options[:topic].arn : options[:topic]

        unless group = @group
          if group = options[:group]
            group = Group.new(group) unless group.is_a?(Group)
          else
            raise ArgumentError, 'missing required :group option'
          end
        end

        unless types = options[:types]
          types = AutoScaling.new(:config => config).notification_types
        end

        notification_config = NotificationConfiguration.new(group, topic_arn)
        notification_config.notification_types = types
        notification_config

      end
      alias_method :put, :create

      # @yield [notification_config]
      # @yieldparam [NotificationConfiguration] notification_config
      def each &block

        #
        # <grumble> We can't use the standard pageable collection mixin here.
        # When you provide :max_records it returns each notification
        # type as an individual record, instead of notification configurations
        # with grouped types.  This makes it very possible to
        # get a part of a configuration in one page of results with the
        # rest in the next page.
        #
        # So instead we will request and group them all before yielding.
        #

        next_token = nil

        groups = {}

        begin

          client_opts = {}
          client_opts[:next_token] = next_token if next_token
          client_opts[:auto_scaling_group_names] = [@group.name] if @group

          resp = client.describe_notification_configurations(client_opts)
          resp.notification_configurations.each do |c|
            group_name = c.auto_scaling_group_name
            groups[group_name] ||= {}
            groups[group_name][c.topic_arn] ||= []
            groups[group_name][c.topic_arn] << c.notification_type
          end

          next_token = resp.data[:next_token]

        end while next_token

        groups.each_pair do |group_name, topics|
          topics.each_pair do |topic_arn, types|

            notification_config = NotificationConfiguration.new(
              Group.new(group_name, :config => config), topic_arn, types)

            yield(notification_config)

          end
        end

      end
    end
  end
end
