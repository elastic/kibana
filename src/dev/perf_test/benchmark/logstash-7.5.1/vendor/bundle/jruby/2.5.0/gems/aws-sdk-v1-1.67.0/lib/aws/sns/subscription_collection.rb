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

    # Represents the collection of all subscriptions for the AWS
    # account.  For example:
    #
    #     # get the ARNs of all SQS queues with subscriptions to topics
    #     # owned by this account
    #     topic.subscriptions.
    #       select { |s| s.protocol == :sqs }.
    #       collect(&:endpoint)
    #
    class SubscriptionCollection

      include Core::Collection::WithNextToken

      # Returns a subscription with the given ARN.  This does not make
      # a request to AWS.
      # @param [String] arn The subscription ARN.
      # @return [Subscription]
      def [] arn
        Subscription.new(arn, :config => config)
      end

      protected

      # Yield each subscription belonging to this account.
      # @yieldparam [Subscription] subscription Each of the
      #   subscriptions in the account.
      # @return [nil]
      def _each_item next_token, options, &block

        options[:next_token] = next_token if next_token

        resp = client.send(client_method, options.merge(request_options))
        resp.data[:subscriptions].each do |sub|

          subscription = Subscription.new(
            sub[:subscription_arn],
            :endpoint => sub[:endpoint],
            :protocol => sub[:protocol].tr('-','_').to_sym,
            :owner_id => sub[:owner],
            :topic_arn => sub[:topic_arn],
            :config => config)

          yield(subscription)

        end

        resp.data[:next_token]

      end

      def client_method
        :list_subscriptions
      end

      def request_options
        {}
      end

    end

  end
end
