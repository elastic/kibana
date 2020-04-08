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
  class Glacier

    #
    # @attr_reader [String] arn
    #
    # @attr_reader [Integer] size_in_bytes
    #
    # @attr_reader [Integer] number_of_archives
    #
    # @attr_reader [Time] creation_date
    #
    # @attr_reader [Time] last_inventory_date
    #
    class Vault < Resource

      # @param [String] name
      # @param [Hash] options
      # @option options [String] :account_id
      def initialize name, options = {}
        @name = name
        super
      end

      # @return [String]
      attr_reader :name

      attribute :arn, :from => :vault_arn, :static => true

      attribute :size_in_bytes

      attribute :number_of_archives

      attribute :creation_date, :static => true

      attribute :last_inventory_date

      populates_from(:list_vaults) do |resp|
        resp.request_options[:account_id] == account_id and
        resp[:vault_list].find {|vault| vault[:vault_name] == name }
      end

      populates_from(:describe_vault) do |resp|
        if resp.request_options[:account_id] == account_id and resp[:vault_name] == name
          resp
        end
      end

      # @return [Boolean] Returns `true` if the vault exists.
      def exists?
        client.describe_vault(:vault_name => name, :account_id => account_id)
        true
      rescue Errors::ResourceNotFoundException
        false
      end

      # @return [ArchiveCollection]
      def archives
        ArchiveCollection.new(self, :account_id => account_id)
      end

      # @param [String,SNS::Topic] topic The SNS topic ARN string or an
      #   SNS::Topic object to send event notifications to.
      # @param [Array<String>] events An array of one or more events for
      #   which you want Amazon Glacier to send notifications.
      #   Valid values include:
      #   * 'ArchiveRetrievalCompleted'
      #   * 'InventoryRetrievalCompleted'
      # @return [VaultNotificationConfiguration]
      def configure_notifications topic, events

        topic_arn = topic.is_a?(String) ? topic : topic.arn

        cfg = VaultNotificationConfiguration.new
        cfg.sns_topic = SNS::Topic.new(topic_arn, :config => config)
        cfg.events = events
        cfg

        self.notification_configuration = cfg

      end

      # @return [VaultNotificationConfiguration,nil]
      def notification_configuration
        resp = client.get_vault_notifications(resource_options)
        cfg = VaultNotificationConfiguration.new
        cfg.sns_topic = SNS::Topic.new(resp[:sns_topic], :config => config)
        cfg.events = resp[:events]
        cfg
      rescue Errors::ResourceNotFoundException
        nil
      end

      # Sets the notification configuration for this vault.  If you pass
      # a `nil` value, the notification configuration will be deleted
      # @param [VaultNotificationConfiguration] cfg
      def notification_configuration= cfg
        if cfg
          opts = {}
          opts.merge!(resource_options)
          opts[:vault_notification_config] = {}
          opts[:vault_notification_config][:sns_topic] = cfg.sns_topic.arn
          opts[:vault_notification_config][:events] = cfg.events
          client.set_vault_notifications(opts)
        else
          client.delete_vault_notifications(resource_options)
        end
      end

      # Deletes the current vault.  You can only delete an empty vault.
      # @return [nil]
      def delete
        client.delete_vault(resource_options)
        nil
      end

      protected

      def get_resource attr = nil
        client.describe_vault(resource_options)
      end

      def resource_identifiers
        [
          [:vault_name, name],
          [:account_id, account_id],
        ]
      end

    end
  end
end
