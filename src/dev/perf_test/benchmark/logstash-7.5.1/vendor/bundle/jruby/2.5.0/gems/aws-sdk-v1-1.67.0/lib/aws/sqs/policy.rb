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

    # (see Core::Policy)
    class Policy < Core::Policy

      class Statement < Core::Policy::Statement

        ACTION_MAPPING = {
          :add_permission => 'sqs:AddPermission',
          :change_message_visibility => 'sqs:ChangeMessageVisibility',
          :create_queue => 'sqs:CreateQueue',
          :delete_message => 'sqs:DeleteMessage',
          :delete_queue => 'sqs:DeleteQueue',
          :get_queue_attributes => 'sqs:GetQueueAttributes',
          :list_queues => 'sqs:ListQueues',
          :receive_message => 'sqs:ReceiveMessage',
          :remove_permission => 'sqs:RemovePermission',
          :send_message => 'sqs:SendMessage',
          :set_queue_attributes => 'sqs:SetQueueAttributes',
        }

        protected
        def resource_arn resource
          case resource
          when Queue then URI.parse(resource.url).path
          else resource.to_s
          end
        end

      end

    end
  end
end
