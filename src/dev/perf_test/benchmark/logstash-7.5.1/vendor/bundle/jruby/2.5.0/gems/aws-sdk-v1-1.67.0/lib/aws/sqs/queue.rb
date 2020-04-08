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

require 'openssl'

module AWS
  class SQS

    # Represents an Amazon SQS Queue.
    #
    # @example Sending a message
    #
    #   msg = queue.send_message("HELLO")
    #   puts "Sent message: #{msg.id}"
    #
    # @example Polling for messages indefinitely
    #
    #   queue.poll do |msg|
    #     puts "Got message: #{msg.body}"
    #   end
    #
    class Queue

      # The default number of seconds to wait between polling requests for
      # new messages.
      # @deprecated No longer used by {#poll}
      DEFAULT_POLL_INTERVAL = 1

      # The default number of seconds to pass in as the SQS long polling
      # value (`:wait_time_seconds`) in {#receive_message}.
      #
      # @since 1.8.0
      DEFAULT_WAIT_TIME_SECONDS = 15

      include Core::Model

      # @return [String] The queue URL.
      attr_reader :url

      # @api private
      def initialize(url, opts = {})
        @url = url
        super
      end

      # Deletes the queue, regardless of whether it is empty.
      #
      # When you delete a queue, the deletion process takes up to 60
      # seconds. Requests you send involving that queue during the
      # 60 seconds might succeed. For example, calling
      # {#send_message} might succeed, but after the 60 seconds, the
      # queue and that message you sent no longer exist.
      #
      # Also, when you delete a queue, you must wait at least 60 seconds
      # before creating a queue with the same name.
      # @return [nil]
      def delete
        client.delete_queue(:queue_url => url)
        nil
      end

      # Represents a message sent using {Queue#send_message}.
      class SentMessage

        # @return [String] Returns the message ID.
        attr_accessor :message_id

        alias_method :id, :message_id

        # @return [String] Returns the request ID.
        attr_accessor :request_id

        # @return [String] Returns an MD5 digest of the message body
        #   string.  You can use this to verify that SQS received your
        #   message correctly.
        attr_accessor :md5

      end

      # Delivers a message to this queue.
      #
      # @param [String] body The message to send.  The maximum
      #   allowed message size is 64 KB.  The message may only
      #   contain Unicode characters from the following list,
      #   according to the W3C XML specification (for more
      #   information, go to
      #   http://www.w3.org/TR/REC-xml/#charsets).  If you send any
      #   characters not included in the list, your request will be
      #   rejected.
      #
      #   * `#x9`
      #   * `#xA`
      #   * `#xD`
      #   * `#x20` to `#xD7FF`
      #   * `#xE000` to `#xFFFD`
      #   * `#x10000` to `#x10FFFF`
      #
      # @param [Hash] options
      #
      # @option options [Integer] :delay_seconds The number of seconds to
      #   delay the message. The message will become available for
      #   processing after the delay time has passed.
      #   If you don't specify a value, the default value for the
      #   queue applies.  Should be from 0 to 900 (15 mins).
      #
      # @return [SentMessage] An object containing information about
      #   the message that was sent.
      #
      def send_message body, options = {}

        client_opts = options.dup
        client_opts[:queue_url] = url
        client_opts[:message_body] = body

        response = client.send_message(client_opts)

        msg = SentMessage.new
        msg.message_id = response[:message_id]
        msg.request_id = (response[:response_metadata] || {})[:request_id]
        msg.md5 = response[:md5_of_message_body]

        verify_send_message_checksum body, msg.md5

        msg

      end

      # Retrieves one or more messages.  When a block is given, each
      # message is yielded to the block and then deleted as long as
      # the block exits normally.  When no block is given, you must
      # delete the message yourself using {ReceivedMessage#delete}.
      #
      # @note Due to the distributed nature of the queue, a weighted
      #   random set of machines is sampled on a ReceiveMessage
      #   call. That means only the messages on the sampled machines
      #   are returned. If the number of messages in the queue is
      #   small (less than 1000), it is likely you will get fewer
      #   messages than you requested per call to
      #   {#receive_message}. If the number of messages in the queue
      #   is extremely small, you might not receive any messages.
      #   To poll continually for messages, use the {#poll} method,
      #   which automatically retries the request after a
      #   configurable delay.
      #
      # @param [Hash] opts Options for receiving messages.
      #
      # @option opts [Integer] :limit The maximum number of messages
      #   to receive.  By default this is 1, and the return value is
      #   a single message object.  If this options is specified and
      #   is not 1, the return value is an array of message objects;
      #   however, the array may contain fewer objects than you
      #   requested.  Valid values: integers from 1 to 10.
      #
      #   Not necessarily all the messages in the queue are returned
      #   (for more information, see the preceding note about
      #   machine sampling).
      #
      # @option opts [Integer] :wait_time_seconds The number of seconds
      #   the service should wait for a response when requesting a new message.
      #   Defaults to the {#wait_time_seconds} attribute defined on the queue.
      #   See {#wait_time_seconds} to set the global long poll setting
      #   on the queue.
      #
      # @option opts [Integer] :visibility_timeout The duration (in
      #   seconds) that the received messages are hidden from
      #   subsequent retrieve requests.  Valid values: integer from
      #   0 to 43200 (maximum 12 hours)
      #
      # @option opts [Array<Symbol, String>] :attributes The
      #   attributes to populate in each received message.  Valid values:
      #
      #   * `:all` (to populate all attributes)
      #   * `:sender_id`
      #   * `:sent_at`
      #   * `:receive_count`
      #   * `:first_received_at`
      #
      #   See {ReceivedMessage} for documentation on each
      #   attribute's meaning.
      #
      # @option opts [Array<String>] :message_attribute_names A list of
      #   message attribute names to receive. These will be available on
      #   the {ReceivedMessage} as `#message_attributes`.
      #
      # @yieldparam [ReceivedMessage] message Each message that was received.
      #
      # @return [ReceivedMessage] Returns the received message (or messages)
      #   only if a block is not given to this method.
      #
      def receive_message(opts = {}, &block)
        resp = client.receive_message(receive_opts(opts))

        failed = verify_receive_message_checksum resp

        raise Errors::ChecksumError.new(failed) unless failed.empty?

        messages = resp[:messages].map do |m|
          ReceivedMessage.new(self, m[:message_id], m[:receipt_handle],
            :body => m[:body],
            :md5 => m[:md5_of_body],
            :request_id => (resp[:response_metadata] || {})[:request_id],
            :attributes => m[:attributes],
            :message_attributes => m[:message_attributes])
        end

        if block
          call_message_block(messages, block)
        elsif opts[:limit] && opts[:limit] != 1
          messages
        else
          messages.first
        end
      end
      alias_method :receive_messages, :receive_message

      # Polls continually for messages.  For example, you can use
      # this to poll indefinitely:
      #
      #     queue.poll { |msg| puts msg.body }
      #
      # Or, to poll indefinitely for the first message and then
      # continue polling until no message is received for a period
      # of at least ten seconds:
      #
      #     queue.poll(:initial_timeout => false,
      #                :idle_timeout => 10) { |msg| puts msg.body }
      #
      # As with the block form of {#receive_message}, this method
      # automatically deletes the message then the block exits
      # normally.
      #
      # @yieldparam [ReceivedMessage] message Each message that was received.
      #
      # @param [Hash] opts Options for polling.
      #
      # @option opts [Integer] :wait_time_seconds The number of seconds
      #   the service should wait for a response when requesting a new message.
      #   Defaults to {DEFAULT_WAIT_TIME_SECONDS}. Use `nil` to
      #   use the queue's global long polling wait time setting.
      #   See {#wait_time_seconds} to set the global long poll setting
      #   on the queue.
      #
      # @option opts [Integer] :idle_timeout The maximum number of
      #   seconds to spend polling while no messages are being
      #   returned.  By default this method polls indefinitely
      #   whether messages are received or not.
      #
      # @option opts [Integer] :initial_timeout The maximum number
      #   of seconds to spend polling before the first message is
      #   received.  This option defaults to the value of
      #   `:idle_timeout`.  You can specify `false` to poll
      #   indefinitely for the first message when `:idle_timeout` is
      #   set.
      #
      # @option opts [Integer] :batch_size The maximum number of
      #   messages to retrieve in a single request.  By default
      #   messages are received one at a time.  Valid values:
      #   integers from 1 to 10.
      #
      # @option opts [Integer] :visibility_timeout The duration (in
      #   seconds) that the received messages are hidden from
      #   subsequent retrieve requests.  Valid values: integer from
      #   0 to 43200 (maximum 12 hours)
      #
      # @option opts [Array<Symbol, String>] :attributes The
      #   attributes to populate in each received message.  Valid values:
      #
      #   * `:all` (to populate all attributes)
      #   * `:sender_id`
      #   * `:sent_at`
      #   * `:receive_count`
      #   * `:first_received_at`
      #
      #   See {ReceivedMessage} for documentation on each
      #   attribute's meaning.
      #
      # @option opts [Float, Integer] :poll_interval As of
      #   v1.7.2, this option is no longer used. See the
      #   `:wait_time_seconds` option for long polling instead.
      #
      # @return [nil]
      def poll(opts = {}, &block)
        opts[:limit] = opts.delete(:batch_size) if
          opts.key?(:batch_size)

        opts[:wait_time_seconds] = DEFAULT_WAIT_TIME_SECONDS unless
          opts.has_key?(:wait_time_seconds)

        last_message_at = Time.now
        got_first = false
        loop do
          got_msg = false
          receive_messages(opts) do |message|
            got_msg = got_first = true
            last_message_at = Time.now
            yield(message)
          end
          unless got_msg
            return if hit_timeout?(got_first, last_message_at, opts)
          end
        end
        nil
      end

      # @return [Integer] The approximate number of visible messages
      #   in a queue.  For more information, see
      #   [Resources Required to Process Messages](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/IntroductionArticle.html#ApproximateNumber)
      #   in the Amazon SQS Developer Guide.
      def approximate_number_of_messages
        get_attribute("ApproximateNumberOfMessages").to_i
      end
      alias_method :visible_messages, :approximate_number_of_messages

      # @return [Integer] The approximate number of messages that
      #   are not timed-out and not deleted.  For more information,
      #   see [Resources Required to Process Messages](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/IntroductionArticle.html#ApproximateNumber)
      #   in the Amazon SQS Developer Guide.
      def approximate_number_of_messages_not_visible
        get_attribute("ApproximateNumberOfMessagesNotVisible").to_i
      end
      alias_method :invisible_messages, :approximate_number_of_messages_not_visible

      # @return [Integer] Returns the visibility timeout for the
      #   queue. For more information about visibility timeout, see
      #   [Visibility Timeout](http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/IntroductionArticle.html#AboutVT)
      #   in the Amazon SQS Developer Guide.
      def visibility_timeout
        get_attribute("VisibilityTimeout").to_i
      end

      # Sets the visibility timeout for the queue.
      #
      # @param [Integer] timeout The length of time (in seconds)
      #   that a message received from a queue will be invisible to
      #   other receiving components when they ask to receive
      #   messages.  Valid values: integers from 0 to 43200 (12
      #   hours).
      #
      # @return Returns the value passed as a timeout.
      def visibility_timeout=(timeout)
        set_attribute("VisibilityTimeout", timeout.to_s)
        timeout
      end

      # @return [Time] The time when the queue was created.
      def created_timestamp
        Time.at(get_attribute("CreatedTimestamp").to_i)
      end

      # @return [Time] The time when the queue was last changed.
      def last_modified_timestamp
        Time.at(get_attribute("LastModifiedTimestamp").to_i)
      end

      # @return [Integer] The limit of how many bytes a message can
      #   contain before Amazon SQS rejects it.
      def maximum_message_size
        get_attribute("MaximumMessageSize").to_i
      end

      # Sets the maximum message size for the queue.
      #
      # @param [Integer] size The limit of how many bytes a message
      #   can contain before Amazon SQS rejects it.  This must be an
      #   integer from 1024 bytes (1KB) up to 65536 bytes
      #   (64KB). The default for this attribute is 8192 (8KB).
      # @return Retuns the passed size argument.
      def maximum_message_size=(size)
        set_attribute("MaximumMessageSize", size.to_s)
      end

      # @return [Integer] The number of seconds Amazon SQS retains a
      #   message.
      def message_retention_period
        get_attribute("MessageRetentionPeriod").to_i
      end

      # Sets the message retention period for the queue
      #
      # @param [Integer] period The number of seconds Amazon SQS
      #   retains a message.  Must be an integer from 3600 (1 hour)
      #   to 1209600 (14 days). The default for this attribute is
      #   345600 (4 days).
      # @return Returns the passed period argument.
      def message_retention_period=(period)
        set_attribute("MessageRetentionPeriod", period.to_s)
        period
      end

      # @return [Integer] Gets the current default delay for messages sent
      #   to the queue.
      def delay_seconds
        get_attribute("DelaySeconds").to_i
      end

      # Sets the default delay for messages sent to the queue.
      # @param [Integer] seconds How many seconds a message will be delayed.
      def delay_seconds= seconds
        set_attribute("DelaySeconds", seconds.to_s)
      end

      # @return [Integer] Gets the number of seconds the service will wait
      #   for a response when requesting a new message
      # @since 1.8.0
      def wait_time_seconds
        get_attribute("ReceiveMessageWaitTimeSeconds").to_i
      end

      # Sets the number of seconds that the service should wait for a response
      # when requesting a new message
      # @param [Integer] seconds How many seconds to wait for a response
      # @since 1.8.0
      def wait_time_seconds= seconds
        set_attribute("ReceiveMessageWaitTimeSeconds", seconds.to_s)
      end

      # @return [Integer] Returns an approximate count of messages delayed.
      def approximate_number_of_messages_delayed
        get_attribute("ApproximateNumberOfMessagesDelayed").to_i
      end

      # @return [String] The queue's Amazon resource name (ARN).
      def arn
        @arn ||= get_attribute("QueueArn")
      end

      # @return [Boolean] True if the queue exists.
      #
      # @note This may raise an exception if you don't have
      #   permission to access the queue attributes.  Also, it may
      #   return true for up to 60 seconds after a queue has been
      #   deleted.
      def exists?
        client.get_queue_attributes(:queue_url => url,
                                    :attribute_names => ["QueueArn"])
      rescue Errors::NonExistentQueue, Errors::InvalidAddress
        false
      else
        true
      end

      # @api private
      module PolicyProxy

        attr_accessor :queue

        def change
          yield(self)
          queue.policy = self
        end

        def delete
          queue.client.send(:set_attribute, 'Policy', '')
        end

      end

      # @return [Policy] Returns the current queue policy if there is one.
      #   Returns `nil` otherwise.
      def policy
        if policy_json = get_attribute('Policy')
          policy = SQS::Policy.from_json(policy_json)
          policy.extend(PolicyProxy)
          policy.queue = self
          policy
        else
          nil
        end
      end

      # Set the policy on this queue.
      #
      # If you pass nil or an empty string then it will have the same
      # effect as deleting the policy.
      #
      # @param policy The policy to set.  This policy can be a {Policy} object,
      #   a json policy string, or any other object that responds with a policy
      #   string when it received #to_json.
      #
      # @return [nil]
      #
      def policy= policy
        policy_string = case policy
        when nil, '' then ''
        when String  then policy
        else policy.to_json
        end
        set_attribute('Policy', policy_string)
        nil
      end

      # Sends a batch of up to 10 messages in a single request.
      #
      #     queue.send_messages('message-1', 'message-2')
      #
      # You can also set an optional delay for all of the messages:
      #
      #     # delay all messages 15 minutes
      #     queue.batch_send(msg1, msg2, :delay_seconds => 900)
      #
      # If you need to set a custom delay for each message you can pass
      # hashes:
      #
      #     messages = []
      #     messages << { :message_body => 'msg1', :delay_seconds => 60 }
      #     messages << { :message_body => 'msg2', :delay_seconds => 30 }
      #
      #     queue.batch_send(messages)
      #
      # @param [String,Hash] messages A list of messages.  Each message
      #   should be a string, or a hash with a `:message_body`,
      #   and optionally `:delay_seconds`.
      #
      # @raise [Errors::BatchSendError] Raises this error when one or more
      #   of the messages failed to send, but others did not.  On the raised
      #   object you can access a list of the messages that failed, and
      #   a list of messages that succeeded.
      #
      # @return [Array<SentMessage>] Returns an array of sent message objects.
      #   Each object responds to #message_id and #md5_of_message_body.
      #   The message id is generated by Amazon SQS.
      #
      def batch_send *messages

        entries = messages.flatten

        unless entries.first.is_a?(Hash)
          options = entries.last.is_a?(Hash) ? entries.pop : {}
          entries = entries.collect{|msg| { :message_body => msg } }
          if delay = options[:delay_seconds]
            entries.each {|entry| entry[:delay_seconds] = delay }
          end
        end

        entries.each_with_index {|entry,n| entry[:id] = n.to_s }

        client_opts = {}
        client_opts[:queue_url] = url
        client_opts[:entries] = entries

        response = client.send_message_batch(client_opts)

        failed = batch_failures(entries, response, true)

        checksum_failed = verify_send_message_batch_checksum entries, response

        sent = response[:successful].collect do |sent|
          msg = SentMessage.new
          msg.message_id = sent[:message_id]
          msg.md5 = sent[:md5_of_message_body]
          msg
        end

        if !failed.empty? && !checksum_failed.empty?
          send_error = Errors::BatchSendError.new(sent, failed)
          checksum_error = Errors::ChecksumError.new(checksum_failed)
          raise Errors::BatchSendMultiError.new send_error, checksum_error
        elsif !failed.empty?
          raise Errors::BatchSendError.new(sent, failed) unless failed.empty?
        elsif !checksum_failed.empty?
          raise Errors::ChecksumError.new(checksum_failed)
        end

        sent

      end

      # @param [ReceivedMessage,String] messages A list of up to 10 messages
      #   to delete.  Each message should be a {ReceivedMessage} object
      #   or a received message handle (string).
      #
      # @raise [Errors::BatchDeleteSend] Raised when one or more of the
      #   messages failed to delete.  The raised error has a list
      #   of the failures.
      #
      # @return [nil]
      #
      def batch_delete *messages

        entries = []
        messages.flatten.each_with_index do |msg,n|
          handle = msg.is_a?(ReceivedMessage) ? msg.handle : msg
          entries << { :id => n.to_s, :receipt_handle => handle }
        end

        response = client.delete_message_batch(
          :queue_url => url, :entries => entries)

        failures = batch_failures(entries, response)

        raise Errors::BatchDeleteError.new(failures) unless failures.empty?

        nil

      end

      # @overload batch_change_visibility(visibility_timeout, *messages)
      #
      #   Accepts a single `:visibility_timeout` value and a list of
      #   messages ({ReceivedMessage} objects or receipt handle strings).
      #   This form of the method is useful when you want to set the same
      #   timeout value for each message.
      #
      #       queue.batch_change_visibility(10, messages)
      #
      #   @param [Integer] visibility_timeout The new value for the message's
      #     visibility timeout (in seconds).
      #
      #   @param [ReceivedMessage,String] message A list of up to 10 messages
      #     to change the visibility timeout for.
      #
      #   @raise [BatchChangeVisibilityError] Raises this error when one
      #     or more of the messages failed the visibility update.
      #
      #   @return [nil]
      #
      # @overload batch_change_visibility(*messages_with_timeouts)
      #
      #   Accepts a list of hashes.  Each hash should provide the visibility
      #   timeout and message (a {ReceivedMessage} object or the recipt handle
      #   string).
      #
      #   Use this form when each message needs a different visiblity timeout.
      #
      #       messages = []
      #       messages << { :message => 'handle1', :visibility_timeout => 5 }
      #       messages << { :message => 'handle2', :visibility_timeout => 10 }
      #
      #       queue.batch_change_visibility(*messages)
      #
      #   @param [Hash] message A list hashes, each with a `:visibility_timeout`
      #     and a `:message`.
      #
      #   @raise [BatchChangeVisibilityError] Raises this error when one
      #     or more of the messages failed the visibility update.
      #
      #   @return [nil]
      #
      def batch_change_visibility *args

        args = args.flatten

        if args.first.is_a?(Integer)
          timeout = args.shift
          messages = args.collect{|m| [m, timeout] }
        else
          messages = args.collect{|m| [m[:message], m[:visibility_timeout]] }
        end

        entries = []
        messages.each do |msg,timeout|
          handle = msg.is_a?(ReceivedMessage) ? msg.handle : msg
          entries << {
            :id => entries.size.to_s,
            :receipt_handle => handle,
            :visibility_timeout => timeout,
          }
        end

        response = client.change_message_visibility_batch(
          :queue_url => url, :entries => entries)

        failures = batch_failures(entries, response)

        raise Errors::BatchChangeVisibilityError.new(failures) unless
          failures.empty?

        nil

      end

      # @return [Boolean] Returns true if the other queue has the same
      #   url.
      def ==(other)
        other.kind_of?(Queue) and other.url == url
      end
      alias_method :eql?, :==

      # @api private
      def inspect
        "<#{self.class}:#{url}>"
      end

      protected
      def batch_failures entries, response, include_batch_index=false
        response[:failed].inject([]) do |failures, failure|

          entry = entries.find{|e| e[:id] == failure[:id] }

          details = {
            :error_code => failure[:code],
            :error_message => failure[:message],
            :sender_fault => failure[:sender_fault],
          }

          if include_batch_index
            details[:batch_index] = failure[:id].to_i
          end

          if message_body = entry[:message_body]
            details[:message_body] = message_body
          end

          if handle = entry[:receipt_handle]
            details[:receipt_handle] = handle
          end

          failures << details

        end
      end

      # @api private
      protected
      def hit_timeout?(got_first, last_message_at, opts)
        initial_timeout = opts[:initial_timeout]
        idle_timeout = opts[:idle_timeout]

        timeout = (got_first ||
                   # if initial_timeout is false (as opposed
                   # to nil) then we skip the branch and poll
                   # indefinitely until the first message
                   # comes
                   (!initial_timeout && initial_timeout != false) ?
                   idle_timeout :
                   initial_timeout) and
          Time.now - last_message_at > timeout
      end

      # @api private
      protected
      def receive_opts(opts)
        receive_opts = { :queue_url => url }
        receive_opts[:visibility_timeout] = opts[:visibility_timeout] if
          opts[:visibility_timeout]
        receive_opts[:max_number_of_messages] = opts[:limit] if
          opts[:limit]
        receive_opts[:wait_time_seconds] = opts[:wait_time_seconds] if
          opts[:wait_time_seconds]
        receive_opts[:message_attribute_names] = opts[:message_attribute_names] if
          opts[:message_attribute_names]

        if names = opts[:attributes]
          receive_opts[:attribute_names] = names.map do |name|
            name = ReceivedMessage::ATTRIBUTE_ALIASES[name.to_sym] if
              ReceivedMessage::ATTRIBUTE_ALIASES.key?(name.to_sym)
            name = Core::Inflection.class_name(name.to_s) if name.kind_of?(Symbol)
            name
          end
        end

        receive_opts
      end

      # @api private
      protected
      def call_message_block(messages, block)
        result = nil
        messages.each do |message|
          begin
            result = block.call(message)
          rescue Exception => e
            raise
          else
            message.delete
          end
        end
        result
      end

      # @api private
      protected
      def get_attribute(name)
        resp = client.get_queue_attributes(:queue_url => url,
                                           :attribute_names =>
                                           [name, "QueueArn"].uniq)
        @arn ||= resp.attributes["QueueArn"]
        resp.attributes[name]
      end

      # @api private
      protected
      def set_attribute(name, value)
        client.set_queue_attributes({
          :queue_url => url,
          :attributes => { name => value },
        })
      end

      # @api private
      protected
      def is_checksum_valid checksum, data
        if config.sqs_verify_checksums?
          calculate_checksum(data) == checksum
        else
          true
        end
      end

      # @api private
      protected
      def calculate_checksum data
        OpenSSL::Digest::MD5.hexdigest data
      end

      # @api private
      protected
      def verify_send_message_checksum body, md5
        unless is_checksum_valid md5, body
          raise Errors::ChecksumError.new "Invalid MD5 #{md5} for message body #{body}"
        end
      end

      # @api private
      protected
      def verify_send_message_batch_checksum entries, response
        failed = []

        response[:successful].each do |msg|
          entry = entries.find{ |e| e[:id] == msg[:id] }
          failed << msg unless is_checksum_valid msg[:md5_of_message_body], entry[:message_body]
        end

        failed
      end

      # @api private
      protected
      def verify_receive_message_checksum response
        return [] if response[:messages].nil?

        invalid_msgs = []

        response[:messages].each do |msg|
          md5 = msg[:md5_of_body]
          body = msg[:body]
          invalid_msgs << msg unless is_checksum_valid md5, body
        end

        invalid_msgs
      end

    end

  end
end
