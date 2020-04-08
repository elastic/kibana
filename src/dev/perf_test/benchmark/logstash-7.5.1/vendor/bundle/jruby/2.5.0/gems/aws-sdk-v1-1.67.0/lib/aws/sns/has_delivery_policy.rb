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

    # A module shared between {Topic} and {Subscription}.  Provides methods
    # for getting and setting the delivery policy and for getting the
    # effective delivery policy.
    module HasDeliveryPolicy

      # @return [nil,Hash] Returns the delivery policy.
      def delivery_policy
        parse_delivery_policy(delivery_policy_json)
      end

      # @return [Hash] Returns the effective delivery policy.
      def effective_delivery_policy
        parse_delivery_policy(effective_delivery_policy_json)
      end

      # @param [nil,Hash,String<JSON>] policy A delivery policy.  You can
      #   pass a JSON string, A policy hash or nil.
      def delivery_policy= policy

        policy_json = case policy
        when nil then ''
        when String then policy
        else policy.to_json
        end

        update_delivery_policy(policy_json)

      end

      # @return [nil,String] Returns the delivery policy JSON string.
      def delivery_policy_json
        raise NotImplementedError
      end

      # @return [String] Returns the effective delivery policy JSON string.
      def effective_delivery_policy_json
        raise NotImplementedError
      end

      protected
      def parse_delivery_policy policy_json
        policy_json.nil? ? nil : JSON.parse(policy_json)
      end

      protected
      def update_delivery_policy policy_json
        raise NotImplementedError
      end

    end
  end
end
