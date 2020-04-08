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

    class TopicCollection

      include Core::Collection::WithNextToken

      # Creates and returns a new SNS Topic.
      # @return [Topic] Returns a new topic with the given name.
      def create name
        response = client.create_topic(:name => name)
        Topic.new(response.topic_arn, :config => config)
      end

      # @param [String] topic_arn An AWS SNS Topic ARN.  It should be
      #   formatted something like:
      #
      #       arn:aws:sns:us-west-2:123456789012:TopicName
      #
      # @return [Topic] Returns a topic with the given Topic ARN.
      def [] topic_arn
        unless topic_arn =~ /^arn:aws/
          raise ArgumentError, "invalid topic arn `#{topic_arn}`"
        end
        Topic.new(topic_arn, :config => config)
      end

      protected

      def _each_item next_token, options, &block

        options[:next_token] = next_token if next_token

        resp = client.list_topics(options)
        resp.data[:topics].each do |details|

          topic = Topic.new(details[:topic_arn], :config => config)

          yield(topic)

        end

        resp.data[:next_token]

      end

    end
  end
end
