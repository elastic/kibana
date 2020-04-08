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

    # Represents all the {Queue} objects in your account.
    #
    # If you have permission to access a queue created by another
    # account, you can also use this collection to access that queue
    # by URL.
    #
    # @example Printing the URLs of all queues
    #
    #   pp sqs.queues.map(&:url)
    #
    # @example Filtering queues by queue name prefix
    #
    #   pp sqs.queues.with_prefix("production_").map(&:url)
    #
    # @example Accessing a queue by URL
    #
    #   url = "http://sqs.us-west-2.amazonaws.com/123456789012/myqueue"
    #   sqs.queues[url].send_message("HELLO")
    #
    # @example Accessing a queue in your account by name
    #
    #   sqs.queues.named("myqueue").send_message("HELLO")
    #
    class QueueCollection

      include Core::Collection::Simple

      # @api private
      def initialize(opts = {})
        @prefix = opts[:prefix]
        super
      end

      # @return [String] The queue name prefix by which this
      #   collection is filtered.
      attr_reader :prefix

      # Creates a new queue.
      #
      # @note If you delete a queue, you must wait at least 60
      #   seconds before creating a queue with the same name.
      #
      # @param [String] name The name to use for the queue created.
      #   Constraints: Maximum 80 characters; alphanumeric
      #   characters, hyphens (-), and underscores (_) are allowed.
      #
      #   The name of the queue should be unique within your account.  If
      #   you provide the name of an existing queue with the same options
      #   it was created with then no error is raised and the existing
      #   queue will be returned.
      #
      # @param [Hash] options
      #
      # @option options [Integer] :visibility_timeout (30) The number of
      #   seconds a message received from a queue will be invisible to
      #   others when they ask to receive messages.
      #
      # @option options [Policy] :policy A policy object or policy desription
      #   (a json string).
      #
      # @option options [Integer] :maximum_message_size (65536) The maximum
      #   number of bytes a message can contain before Amazon SQS rejects
      #   it.
      #
      # @option options [Integer] :delay_seconds The time in seconds that
      #   the delivery of all messages in the queue will be delayed.
      #   This can be overriden when sending a message to the queue.
      #
      # @option options [Integer] :message_retention_period The number of
      #   seconds from 60 (1 minute) to 1209600 (14 days).  The default
      #   is 345600 (4 days).
      #
      # @return [Queue] The newly created queue.
      #
      def create name, options = {}

        # SQS removed the default prefix to the visibility timeout option
        # in the 2011-10-01 update -- this allows us to not break existing
        # customers.
        if options[:default_visibility_timeout]
          options[:visibility_timeout] =
            options.delete(:default_visibility_timeout)
        end

        if policy = options[:policy]
          options[:policy] = policy.to_json unless policy.is_a?(String)
        end

        client_opts = {}
        client_opts[:queue_name] = name
        unless options.empty?
          client_opts[:attributes] = options.inject({}) do |attributes,(k,v)|
            attributes.merge(Core::Inflection.class_name(k.to_s) => v.to_s)
          end
        end

        response = client.create_queue(client_opts)

        Queue.new(response[:queue_url], :config => config)

      end

      # @param [String] prefix The queue name prefix.
      # @return [QueueCollection] A new collection representing only
      #   the queues whose names start with the given prefix.
      def with_prefix(prefix)
        self.class.new(:prefix => prefix, :config => config)
      end

      # @return [Queue] The queue with the given URL.
      def [] url
        Queue.new(url, :config => config)
      end

      # Returns the queue with the given name.  This requires making
      # a request to SQS to get the queue url.  If you know the url,
      # you should use {#[]} instead.
      #
      # @example
      #
      #   queue = AWS::SQS.new.queues.named('my-queue')
      #
      # @param (see #url_for)
      # @option (see #url_for)
      # @return [Queue] Returns the queue with the given name.
      def named queue_name, options = {}
        self[url_for(queue_name, options = {})]
      end

      # Returns the url for the given queue.
      #
      # @example
      #
      #   sqs.queues.url_for('my-queue')
      #   #=> "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"
      #
      # @param [String] queue_name The name of the queue you need a URL for.
      #
      # @param [Hash] options
      #
      # @option options [String] :queue_owner_aws_account_id The AWS account
      #   ID of the account that created the queue.  You can only get the
      #   url for queues in other accounts when the account owner has
      #   granted you permission.
      #
      def url_for queue_name, options = {}
        client_opts = {}
        client_opts[:queue_name] = queue_name
        client.get_queue_url(client_opts.merge(options))[:queue_url]
      end

      protected

      # @yieldparam [Queue] queue Each {Queue} object in the collection.
      def _each_item options, &block

        options[:queue_name_prefix] = prefix if prefix

        resp = client.list_queues(options)
        resp.data[:queue_urls].each do |url|
          queue = self[url]
          yield(queue)
        end

      end

    end

  end
end
