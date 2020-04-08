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

require 'time'
require 'base64'

module AWS
  class SQS

    # Represents message published from an {SNS::Topic} to an {SQS::Queue}.
    class ReceivedSNSMessage

      include Core::Model

      # @param [String] body The SQS message body
      #   from a message published by SNS.
      # @param [Hash] options
      def initialize body, options = {}
        @body = body
        super
      end

      # @return [String] Returns the JSON hash (as a string) as was
      #   published by SNS.  See {#body} to get the decoded message
      #   or {#to_h} to get the decoded JSON hash as a ruby hash.
      def raw_message
        @body
      end

      # @return[String] Returns the decoded message as was published.
      def body
        to_h[:body]
      end

      # @return [String] Returns the ARN for the topic that published this
      #   message.
      def topic_arn
        to_h[:topic_arn]
      end

      # @return [SNS::Topic] Returns the topic that published this message.
      def topic
        SNS::Topic.new(topic_arn, :config => config)
      end

      # @return [String] Returns the message type.
      def message_type
        to_h[:message_type]
      end

      # @return [String] Returns the calculated signature for the message.
      def signature
        to_h[:signature]
      end

      # @return [String] Returns the signature version.
      def signature_version
        to_h[:signature_version]
      end

      # @return [Time] Returns the time the message was published at by SNS.
      #   by SNS.
      def published_at
        to_h[:published_at]
      end

      # @return [String] Returns the unique id of the SNS message.
      def message_id
        to_h[:message_id]
      end

      # @return [String] Returns the url for the signing cert.
      def signing_cert_url
        to_h[:signing_cert_url]
      end

      # @return [String] Returns the url you can request to unsubscribe message
      #   from this queue.
      def unsubscribe_url
        to_h[:unsubscribe_url]
      end

      # @return [Hash] Returns the decoded message as a hash.
      def to_h
        data = JSON.parse(@body)
        {
          :body => data['Message'],
          :topic_arn => data['TopicArn'],
          :message_type => data['Type'],
          :signature => data['Signature'],
          :signature_version => data['SignatureVersion'],
          :published_at => Time.parse(data['Timestamp']),
          :message_id => data['MessageId'],
          :signing_cert_url => data['SigningCertURL'],
          :unsubscribe_url => data['UnsubscribeURL'],
        }
      end

      # @return [Hash] Returns the decoded message body as a hash.
      def body_message_as_h
        @body_message_as_h ||= JSON.parse(to_h[:body])
      end

    end
  end
end
