require 'set'

module Aws
  module SQS

    # A utility class for long polling messages in a loop. **Messages are
    # automatically deleted from the queue at the end of the given block.**
    #
    #     poller = Aws::SQS::QueuePoller.new(queue_url)
    #
    #     poller.poll do |msg|
    #       puts msg.body
    #     end
    #
    # ## Long Polling
    #
    # By default, messages are received using long polling. This
    # method will force a default `:wait_time_seconds` of 20 seconds.
    # If you prefer to use the queue default wait time, then pass
    # a `nil` value for `:wait_time_seconds`.
    #
    #     # disables 20 second default, use queue ReceiveMessageWaitTimeSeconds
    #     poller.poll(wait_time_seconds:nil) do |msg|
    #       # ...
    #     end
    #
    # When disabling `:wait_time_seconds` by passing `nil`, you must
    # ensure the queue `ReceiveMessageWaitTimeSeconds` attribute is
    # set to a non-zero value, or you will be short-polling.
    # This will trigger significantly more API calls.
    #
    # ## Batch Receiving Messages
    #
    # You can specify a maximum number of messages to receive with
    # each polling attempt via `:max_number_of_messages`. When this is
    # set to a positive value, greater than 1, the block will receive
    # an array of messages, instead of a single message.
    #
    #     # receives and yields 1 message at a time
    #     poller.poll do |msg|
    #       # ...
    #     end
    #
    #     # receives and yields up to 10 messages at a time
    #     poller.poll(max_number_of_messages:10) do |messages|
    #       messages.each do |msg|
    #         # ...
    #       end
    #     end
    #
    # The maximum value for `:max_number_of_messages` is enforced by
    # Amazon SQS.
    #
    # ## Visibility Timeouts
    #
    # When receiving messages, you have a fixed amount of time to process
    # and delete the message before it is added back into the queue. This
    # is the visibility timeout. By default, the queue's `VisibilityTimeout`
    # attribute is used. You can provide an alternative visibility timeout
    # when polling.
    #
    #     # queue default VisibilityTimeout
    #     poller.poll do |msg|
    #     end
    #
    #     # custom visibility timeout
    #     poller.poll(visibility_timeout:10) do |msg|
    #     end
    #
    #
    # You can reset the visibility timeout of a single message by calling
    # {#change_message_visibility_timeout}. This is useful when you need
    # more time to finish processing the message.
    #
    #     poller.poll do |msg|
    #
    #       # do work ...
    #
    #       # need more time for processing
    #       poller.change_message_visibility_timeout(msg, 60)
    #
    #       # finish work ...
    #
    #     end
    #
    # If you change the visibility timeout of a message to zero, it will
    # return to the queue immediately.
    #
    # ## Deleting Messages
    #
    # Messages are deleted from the queue when the block returns normally.
    #
    #     poller.poll do |msg|
    #       # do work
    #     end # messages deleted here
    #
    # You can skip message deletion by passing `skip_delete: true`.
    # This allows you to manually delete the messages using
    # {#delete_message}, or {#delete_messages}.
    #
    #     # single message
    #     poller.poll(skip_delete: true) do |msg|
    #       poller.delete_message(msg) # if successful
    #     end
    #
    #     # batch delete messages
    #     poller.poll(skip_delete: true, max_number_of_messages:10) do |messages|
    #       poller.delete_messages(messages)
    #     end
    #
    # Another way to manage message deletion is to throw `:skip_delete`
    # from the poll block. You can use this to choose when a message, or
    # message batch is deleted on an individual basis. This can be very
    # useful when you are capturing temporal errors and wish for the
    # message to timeout.
    #
    #     poller.poll do |msg|
    #       begin
    #         # do work
    #       rescue
    #         # unexpected error occurred while processing messages,
    #         # log it, and skip delete so it can be re-processed later
    #         throw :skip_delete
    #       end
    #     end
    #
    # ## Terminating the Polling Loop
    #
    # By default, polling will continue indefinitely. You can stop
    # the poller by providing an idle timeout or by throwing `:stop_polling`
    # from the {#before_request} callback.
    #
    # ### `:idle_timeout` Option
    #
    # This is a configurable, maximum number of seconds to wait for a
    # new message before the polling loop exists. By default, there is
    # no idle timeout.
    #
    #     # stops polling after a minute of no received messages
    #     poller.poll(idle_timeout: 60) do |msg|
    #       # ...
    #     end
    #
    # ### Throw `:stop_polling`
    #
    # If you want more fine grained control, you can configure a
    # before request callback to trigger before each long poll. Throwing
    # `:stop_polling` from this callback will cause the poller to exit
    # normally without making the next request.
    #
    #     # stop after processing 100 messages
    #     poller.before_request do |stats|
    #       throw :stop_polling if stats.received_message_count >= 100
    #     end
    #
    #     poller.poll do |msg|
    #       # do work ...
    #     end
    #
    # ## Tracking Progress
    #
    # The poller will automatically track a few statistics client-side in
    # a {PollerStats} object. You can access the poller stats
    # three ways:
    #
    # * The first block argument of {#before_request}
    # * The second block argument of {#poll}.
    # * The return value from {#poll}.
    #
    # Here are examples of accessing the statistics.
    #
    # * Configure a {#before_request} callback.
    #
    #   ```
    #   poller.before_request do |stats|
    #     logger.info("requests: #{stats.request_count}")
    #     logger.info("messages: #{stats.received_message_count}")
    #     logger.info("last-timestamp: #{stats.last_message_received_at}")
    #   end
    #   ```
    #
    # * Accept a 2nd argument in the poll block, for example:
    #
    #   ```
    #   poller.poll do |msg, stats|
    #     logger.info("requests: #{stats.request_count}")
    #     logger.info("messages: #{stats.received_message_count}")
    #     logger.info("last-timestamp: #{stats.last_message_received_at}")
    #   end
    #   ```
    #
    # * Return value:
    #
    #   ```
    #   stats = poller.poll(idle_timeout:10) do |msg|
    #     # do work ...
    #   end
    #   logger.info("requests: #{stats.request_count}")
    #   logger.info("messages: #{stats.received_message_count}")
    #   logger.info("last-timestamp: #{stats.last_message_received_at}")
    #   ```
    #
    class QueuePoller

      # @param [String] queue_url
      # @option options [Client] :client
      # @option (see #poll)
      def initialize(queue_url, options = {})
        @queue_url = queue_url
        @client = options.delete(:client) || Client.new
        @default_config = PollerConfig.new(options)
      end

      # @return [String]
      attr_reader :queue_url

      # @return [Client]
      attr_reader :client

      # @return [PollerConfig]
      attr_reader :default_config

      # Registers a callback that is invoked once before every polling
      # attempt.
      #
      #     poller.before_request do |stats|
      #       logger.info("requests: #{stats.request_count}")
      #       logger.info("messages: #{stats.received_message_count}")
      #       logger.info("last-timestamp: #{stats.last_message_received_at}")
      #     end
      #
      #     poller.poll do |msg|
      #       # do work ...
      #     end
      #
      # ## `:stop_polling`
      #
      # If you throw `:stop_polling` from the {#before_request} callback,
      # then the poller will exit normally before making the next long
      # poll request.
      #
      #     poller.before_request do |stats|
      #       throw :stop_polling if stats.received_messages >= 100
      #     end
      #
      #     # at most 100 messages will be yielded
      #     poller.poll do |msg|
      #       # do work ...
      #     end
      #
      # @yieldparam [PollerStats] stats An object that tracks a few
      #   client-side statistics about the queue polling.
      #
      # @return [void]
      def before_request(&block)
        @default_config = @default_config.with(before_request: block) if block_given?
      end

      # Polls the queue, yielded a message, or an array of messages.
      # Messages are automatically deleted from the queue at the
      # end of the given block. See the class documentation on
      # {QueuePoller} for more examples.
      #
      # @example Basic example, loops indefinitely
      #
      #   poller.poll do |msg|
      #     # ...
      #   end
      #
      # @example Receives and deletes messages as a batch
      #
      #   poller.poll(max_number_of_messages:10) do |messages|
      #     messages.each do |msg|
      #       # ...
      #     end
      #   end
      #
      # @option options [Integer] :wait_time_seconds (20) The
      #   long polling interval. Messages are yielded as soon as they are
      #   received. The `:wait_time_seconds` option specifies the max
      #   duration for each polling attempt before a new request is
      #   sent to receive messages.
      #
      # @option options [Integer] :max_number_of_messages (1) The maximum
      #   number of messages to yield from each polling attempt.
      #   Values can be from 1 to 10.
      #
      # @option options [Integer] :visibility_timeout (nil)
      #   The number of seconds you have to process a message before
      #   it is put back into the queue and can be received again.
      #   By default, the queue's
      #
      # @option options [Array<String>] :attribute_names ([])
      #   The list of attributes that need to be returned along with each
      #   message. Valid attribute names include:
      #
      #   * `All` - All attributes.
      #   * `ApproximateFirstReceiveTimestamp` - The time when the message
      #      was first received from the queue (epoch time in milliseconds).
      #   * `ApproximateReceiveCount` - The number of times a message has
      #      been received from the queue but not deleted.
      #   * `SenderId` - The AWS account number (or the IP address, if
      #      anonymous access is allowed) of the sender.
      #   * `SentTimestamp` - The time when the message was sent to the
      #      queue (epoch time in milliseconds).
      #
      # @option options [Array<String>] :message_attribute_names ([])
      #   A list of message attributes to receive. You can receive
      #   all messages by using `All` or `.*`. You can also use
      #   `foo.*` to return all message attributes starting with the
      #   `foo` prefix.
      #
      # @option options [Integer] :idle_timeout (nil) Polling terminates
      #   gracefully when `:idle_timeout` seconds have passed without
      #   receiving any messages.
      #
      # @option options [Boolean] :skip_delete (false) When `true`, messages
      #   are not deleted after polling block. If you wish to delete
      #   received messages, you will need to call `#delete_message` or
      #   `#delete_messages` manually.
      #
      # @option options [Proc] :before_request (nil) Called before each
      #   polling attempt. This proc receives a single argument, an
      #   instance of {PollerStats}.
      #
      # @return [PollerStats]
      def poll(options = {}, &block)
        config = @default_config.with(options)
        stats = PollerStats.new
        catch(:stop_polling) do
          loop do
            messages = get_messages(config, stats)
            if messages.empty?
              check_idle_timeout(config, stats, messages)
            else
              process_messages(config, stats, messages, &block)
            end
          end
        end
        stats.polling_stopped_at = Time.now
        stats
      end

      # @note This method should be called from inside a {#poll} block.
      # @param [#receipt_handle] message An object that responds to
      #   `#receipt_handle`.
      # @param [Integer] seconds
      def change_message_visibility_timeout(message, seconds)
        @client.change_message_visibility({
          queue_url: @queue_url,
          receipt_handle: message.receipt_handle,
          visibility_timeout: seconds,
        })
      end

      # @note This method should be called from inside a {#poll} block.
      # @param [#receipt_handle] message An object that responds to
      #   `#receipt_handle`.
      def delete_message(message)
        @client.delete_message({
          queue_url: @queue_url,
          receipt_handle: message.receipt_handle,
        })
      end

      # @note This method should be called from inside a {#poll} block.
      # @param [Array<#message_id, #receipt_handle>] messages An array of received
      #   messages. Each object must respond to `#message_id` and
      #   `#receipt_handle`.
      def delete_messages(messages)
        @client.delete_message_batch(
          queue_url: @queue_url,
          entries: messages.map { |msg|
            { id: msg.message_id, receipt_handle: msg.receipt_handle }
          }
        )
      end

      private

      def get_messages(config, stats)
        config.before_request.call(stats) if config.before_request
        messages = send_request(config).messages
        stats.request_count += 1
        messages
      end

      def send_request(config)
        params = config.request_params.merge(queue_url: @queue_url)
        @client.receive_message(params)
      end

      def check_idle_timeout(config, stats, messages)
        if config.idle_timeout
          since = stats.last_message_received_at || stats.polling_started_at
          idle_time = Time.now - since
          throw :stop_polling if idle_time > config.idle_timeout
        end
      end

      def process_messages(config, stats, messages, &block)
        stats.received_message_count += messages.count
        stats.last_message_received_at = Time.now
        catch(:skip_delete) do
          yield_messages(config, messages, stats, &block)
          delete_messages(messages) unless config.skip_delete
        end
      end

      def yield_messages(config, messages, stats, &block)
        if config.request_params[:max_number_of_messages] == 1
          messages.each do |msg|
            yield(msg, stats)
          end
        else
          yield(messages, stats)
        end
      end

      # Statistics tracked client-side by the {QueuePoller}.
      class PollerStats

        def initialize
          @request_count = 0
          @received_message_count = 0
          @last_message_received_at = nil
          @polling_started_at = Time.now
          @polling_stopped_at = nil
        end

        # @return [Integer]
        attr_accessor :request_count

        # @return [Integer]
        attr_accessor :received_message_count

        # @return [Time,nil]
        attr_accessor :last_message_received_at

        # @return [Time]
        attr_accessor :polling_started_at

        # @return [Time,nil]
        attr_accessor :polling_stopped_at

      end

      # A read-only set of configuration used by the QueuePoller.
      class PollerConfig

        # @api private
        CONFIG_OPTIONS = Set.new([
          :idle_timeout,
          :skip_delete,
          :before_request,
        ])

        # @api private
        PARAM_OPTIONS = Set.new([
          :wait_time_seconds,
          :max_number_of_messages,
          :visibility_timeout,
          :attribute_names,
          :message_attribute_names,
        ])

        # @return [Integer,nil]
        attr_reader :idle_timeout

        # @return [Boolean]
        attr_reader :skip_delete

        # @return [Proc,nil]
        attr_reader :before_request

        # @return [Hash]
        attr_reader :request_params

        def initialize(options)
          @idle_timeout = nil
          @skip_delete = false
          @before_request = nil
          @request_params = {
            wait_time_seconds: 20,
            max_number_of_messages: 1,
            visibility_timeout: nil,
            attribute_names: ['All'],
            message_attribute_names: ['All'],
          }
          options.each do |opt_name, value|
            if CONFIG_OPTIONS.include?(opt_name)
              instance_variable_set("@#{opt_name}", value)
            elsif PARAM_OPTIONS.include?(opt_name)
              @request_params[opt_name] = value
            else
              raise ArgumentError, "invalid option #{opt_name.inspect}"
            end
          end
          @request_params.freeze
          freeze
        end

        # @return [PollerConfig] Returns a new {PollerConfig} instance
        #   with the given options applied.
        def with(options)
          self.class.new(to_h.merge(options))
        end

        private

        def to_h
          hash = {}
          CONFIG_OPTIONS.each { |key| hash[key] = send(key) }
          PARAM_OPTIONS.each { |key| hash[key] = @request_params[key] }
          hash
        end

      end
    end
  end
end
