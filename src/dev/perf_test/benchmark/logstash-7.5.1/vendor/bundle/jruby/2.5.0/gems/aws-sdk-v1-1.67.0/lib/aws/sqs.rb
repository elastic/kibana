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

require 'aws/core'
require 'aws/sqs/config'

module AWS

  # Provides an expressive, object-oriented interface to Amazon SQS.
  #
  # ## Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the SQS interface:
  #
  #     sqs = AWS::SQS.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # ## Queues and Messages
  #
  # Amazon SQS is a distributed queue system that enables web
  # service applications to quickly and reliably queue messages that
  # one component in the application generates to be consumed by
  # another component. A queue is a temporary repository for
  # messages that are awaiting processing.
  #
  # You can access your queues using the {#queues} collection.  For
  # example, to create a queue, use {QueueCollection#create}:
  #
  #     queue = sqs.queues.create("myqueue")
  #
  # Or to find out what queues you have in your account:
  #
  #     pp sqs.queues.collect(&:url)
  #
  # See the {Queue} class for more information on how to send and
  # receive messages.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level SQS client object
  class SQS

    autoload :Client, 'aws/sqs/client'
    autoload :Errors, 'aws/sqs/errors'
    autoload :Queue, 'aws/sqs/queue'
    autoload :QueueCollection, 'aws/sqs/queue_collection'
    autoload :Policy, 'aws/sqs/policy'
    autoload :ReceivedMessage, 'aws/sqs/received_message'
    autoload :ReceivedSNSMessage, 'aws/sqs/received_sns_message'

    include Core::ServiceInterface

    endpoint_prefix 'sqs'

    # @return [QueueCollection] The collection of all {Queue}
    #   objects in your account.
    def queues
      QueueCollection.new(:config => config)
    end

  end

end
