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
  class STS

    # Represents a federated session using temporary AWS credentials.
    # Use {STS#new_federated_session} to get an instance of this
    # class.
    class FederatedSession < Session

      # The string identifying the federated user associated with the
      # session, similar to the UserId of an IAM user.
      #
      # @return [String]
      attr_reader :user_id

      # The ARN specifying the federated user associated with the
      # session. For more information about ARNs and how to use them
      # in policies, see
      # {http://docs.aws.amazon.com/IAM/latest/UserGuide/index.html?Using_Identifiers.html
      # Identifiers for IAM Entities} in <i>Using AWS Identity and
      # Access Management</i>.
      #
      # @return [String]
      attr_reader :user_arn

      # A percentage value indicating the size of the policy in packed
      # form. Policies for which the packed size is greater than 100%
      # of the allowed value are rejected by the service.
      #
      # @return [Integer]
      attr_reader :packed_policy_size

      # @api private
      def initialize(opts = {})
        @user_id = opts[:user_id]
        @user_arn = opts[:user_arn]
        @packed_policy_size = opts[:packed_policy_size]
        super
      end

    end

  end
end
