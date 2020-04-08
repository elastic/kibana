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

    # (see Core::Policy)
    class Policy < Core::Policy

      class Statement < Core::Policy::Statement

        ACTION_MAPPING = {
          :add_permission => 'sns:AddPermission',
          :delete_topic => 'sns:DeleteTopic',
          :get_topic_attributes => 'sns:GetTopicAttributes',
          :list_subscriptions_by_topic => 'sns:ListSubscriptionsByTopic',
          :publish => 'sns:Publish',
          :receive => 'sns:Receive',
          :remove_permission => 'sns:RemovePermission',
          :set_topic_attributes => 'sns:SetTopicAttributes',
          :subscribe => 'sns:Subscribe',
        }

        protected
        def resource_arn resource
          case resource
          when Topic then resource.arn
          #when Subscription then resource.arn
          else super(resource)
          end
        end

      end

    end
  end
end
