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
  class SNS

    # Represents a subscription of a single endpoint to an SNS topic.
    # To create a subscription, use the {Topic#subscribe} method.
    # Depending on the endpoint type, you may also need to use
    # {Topic#confirm_subscription}.
    class Subscription

      include Core::Model
      include HasDeliveryPolicy

      # @api private
      def initialize(arn, opts = {})
        @arn = arn
        @topic_arn = opts[:topic_arn]
        @endpoint = opts[:endpoint]
        @protocol = opts[:protocol]
        @owner_id = opts[:owner_id]
        super
      end

      # @return [String] The ARN of the subscription.
      attr_reader :arn

      # @return [String] The endpoint.  This can be an HTTP or HTTPS
      # URL, an e-mail address, or a queue ARN.
      attr_reader :endpoint

      # @return [String] The protocol.  Possible values:
      #
      #  * `:http`
      #  * `:https`
      #  * `:email`
      #  * `:email_json`
      #  * `:sqs`
      attr_reader :protocol

      # @return [String] The AWS account ID of the subscription owner.
      def owner_id
        @owner_id ||= get_attributes['Owner']
      end

      # @return [String]
      def topic_arn
        @topic_arn ||= get_attributes['TopicArn']
      end

      # @return [Topic]
      def topic
        Topic.new(topic_arn, :config => config)
      end

      # Deletes this subscription.
      # @return [nil]
      def unsubscribe
        client.unsubscribe(:subscription_arn => arn)
        nil
      end

      # @return [Boolean] Returns true if the subscription confirmation
      #   request was authenticated.
      def confirmation_authenticated?

        return true if @authenticated

        if authenticated = get_attributes['ConfirmationWasAuthenticated']
          @authenticated = true
        else
          false
        end

      end

      # You can get the parsed JSON hash from {#delivery_policy}.
      # @return [nil,String] Returns the delivery policy JSON string.
      def delivery_policy_json
        get_attributes['DeliveryPolicy']
      end

      # You can get the parsed JSON hash from {#effective_delivery_policy}.
      # @return [nil,String] Returns the effective delivery policy JSON string.
      def effective_delivery_policy_json
        get_attributes['EffectiveDeliveryPolicy']
      end

      # @return [Boolean] Returns true if the subscriptions has raw message delivery enabled.
      def raw_message_delivery
        raw_value = get_attributes['RawMessageDelivery']
        raw_value.downcase == 'true'
      end

      # @param [Boolean] raw_delivery Whether to enable or disable raw message delivery.
      def raw_message_delivery= raw_delivery
        value = if raw_delivery
          'true'
        else
          'false'
        end
        update_subscription_attribute('RawMessageDelivery', value)
      end

      # @note This method requests the entire list of subscriptions
      #   for the topic (if known) or the account (if the topic is not
      #   known).  It can be expensive if the number of subscriptions
      #   is high.
      #
      # @return [Boolean] Returns true if the subscription exists.
      def exists?
        begin
          get_attributes
          true
        rescue Errors::NotFound, Errors::InvalidParameter
          false
        end
      end

      # @api private
      def inspect
        "<#{self.class} arn:#{arn}>"
      end

      # @return [Boolean] Returns true if the subscriptions have the same
      #   resource ARN.
      def eql? other
        other.kind_of?(Subscription) and other.arn == arn
      end
      alias_method :==, :eql?

      protected
      def update_subscription_attribute name, value
        client_opts = {}
        client_opts[:subscription_arn] = arn
        client_opts[:attribute_name] = name
        client_opts[:attribute_value] = value
        client.set_subscription_attributes(client_opts)
      end

      protected
      def update_delivery_policy policy_json
        update_subscription_attribute('DeliveryPolicy', policy_json)
      end

      protected
      def get_attributes
        client.get_subscription_attributes(:subscription_arn => arn).attributes
      end

    end

  end
end
