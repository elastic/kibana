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
  class Glacier
    class VaultNotificationConfiguration

      # @return [SNS::Topic] The SNS topic Glacier will publish events to.
      attr_accessor :sns_topic

      alias_method :topic, :sns_topic

      # @return [Array<String>] events An array of one or more events for
      #   which Amazon Glacier will send notifications.
      attr_accessor :events

    end
  end
end
