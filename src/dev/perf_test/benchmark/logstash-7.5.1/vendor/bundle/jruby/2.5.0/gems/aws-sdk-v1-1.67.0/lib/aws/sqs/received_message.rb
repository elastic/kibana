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
  class SQS

    # Represents a message received from an Amazon SQS Queue.
    class ReceivedMessage

      include Core::Model

      # @return [Queue] The queue from which this message was
      #   received.
      attr_reader :queue

      # @return [String] The ID of the message.
      attr_reader :id

      # @return [String] A string associated with this specific
      #   instance of receiving the message.
      attr_reader :handle

      # @return [String] The message's contents.
      attr_reader :body

      # @return [String] An MD5 digest of the message body.
      attr_reader :md5

      # @return [String] The request ID.
      attr_reader :request_id

      # @api private
      attr_reader :attributes

      # @return [String] The message attributes attached to the message.
      attr_reader :message_attributes

      # @api private
      ATTRIBUTE_ALIASES = {
        :sent_at => :sent_timestamp,
        :receive_count => :approximate_receive_count,
        :first_received_at => :approximate_first_receive_timestamp
      }

      # @api private
      def initialize(queue, id, handle, opts = {})
        @queue = queue
        @id = id
        @handle = handle
        @body = opts[:body]
        @md5 = opts[:md5]
        @request_id = opts[:request_id]
        @attributes = opts[:attributes] || {}
        @message_attributes = opts[:message_attributes] || {}
        super
      end

      # When SNS publishes messages to SQS queues the message body is
      # formatted as a json message and then base 64 encoded.
      #
      # @example
      #
      #   sns_msg = message.as_sns_message
      #
      #   sns_msg.topic
      #   #=> <AWS::SNS::Topic ...>
      #
      #   sns_msg.to_h.inspect
      #   #=> { :body => '...', :topic_arn => ... }
      #
      # @return [ReceivedSNSMessage]
      def as_sns_message
        ReceivedSNSMessage.new(body, :config => config)
      end

      # Deletes the message from the queue.  Even if the message is
      # locked by another reader due to the visibility timeout
      # setting, it is still deleted from the queue.  If you leave a
      # message in the queue for more than 4 days, SQS automatically
      # deletes it.
      #
      # If you use {Queue#poll} or {Queue#receive_message} in block
      # form, the messages you receive will be deleted automatically
      # unless an exception occurs while you are processing them.
      # You can still use this method if you want to delete a
      # message early and then continue processing it.
      #
      # @note It is possible you will receive a message even after
      #   you have deleted it. This might happen on rare occasions
      #   if one of the servers storing a copy of the message is
      #   unavailable when you request to delete the message. The
      #   copy remains on the server and might be returned to you
      #   again on a subsequent receive request. You should create
      #   your system to be idempotent so that receiving a
      #   particular message more than once is not a problem.
      #
      # @return [nil]
      def delete
        client.delete_message(
          :queue_url => queue.url,
          :receipt_handle => handle)
        nil
      end

      # Changes the visibility timeout of a specified message in a
      # queue to a new value. The maximum allowed timeout value you
      # can set the value to is 12 hours. This means you can't
      # extend the timeout of a message in an existing queue to more
      # than a total visibility timeout of 12 hours. (For more
      # information visibility timeout, see
      # [Visibility Timeout](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/IntroductionArticle.html#AboutVT)
      # in the Amazon SQS Developer Guide.)
      #
      # For example, let's say the timeout for the queue is 30
      # seconds, and you receive a message. Once you're 20 seconds
      # into the timeout for that message (i.e., you have 10 seconds
      # left), you extend it by 60 seconds by calling this method
      # with `timeout` set to 60 seconds. You have then changed the
      # remaining visibility timeout from 10 seconds to 60 seconds.
      #
      # @note If you attempt to set the timeout to an amount more
      #   than the maximum time left, Amazon SQS returns an
      #   error. It will not automatically recalculate and increase
      #   the timeout to the maximum time remaining.
      #
      # @note Unlike with a queue, when you change the visibility
      #   timeout for a specific message, that timeout value is
      #   applied immediately but is not saved in memory for that
      #   message. If you don't delete a message after it is
      #   received, the visibility timeout for the message the next
      #   time it is received reverts to the original timeout value,
      #   not the value you set with this method.
      #
      # @return Returns the timeout argument as passed.
      #
      def visibility_timeout=(timeout)
        client.change_message_visibility(
          :queue_url => queue.url,
          :receipt_handle => handle,
          :visibility_timeout => timeout
        )
        timeout
      end

      # @return [String] The AWS account number (or the IP address,
      #   if anonymous access is allowed) of the sender.
      def sender_id
        attributes["SenderId"]
      end

      # @return [Time] The time when the message was sent.
      def sent_timestamp
        @sent_at ||=
          (timestamp = attributes["SentTimestamp"] and
           Time.at(timestamp.to_i / 1000.0)) || nil
      rescue RangeError => e
        p [timestamp, timestamp.to_i]
      end
      alias_method :sent_at, :sent_timestamp

      # @return [Integer] The number of times a message has been
      #   received but not deleted.
      def approximate_receive_count
        (count = attributes["ApproximateReceiveCount"] and
         count.to_i) or nil
      end
      alias_method :receive_count, :approximate_receive_count

      # @return [Time] The time when the message was first received.
      def approximate_first_receive_timestamp
        @received_at ||=
          (timestamp = attributes["ApproximateFirstReceiveTimestamp"] and
           Time.at(timestamp.to_i / 1000.0)) || nil
      end
      alias_method :first_received_at, :approximate_first_receive_timestamp

    end

  end
end
