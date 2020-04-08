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

    # Represents a session using temporary AWS credentials.  Use
    # {STS#new_session} or {STS#new_federated_session} to get a new
    # set of temporary credentials.
    class Session

      # A hash containing the following keys:
      #
      # * `:access_key_id`
      # * `:secret_access_key`
      # * `:session_token`
      #
      # This hash may be passed as-is to {AWS.config} or to the
      # constructor of any service interface that supports temporary
      # security credentials from the AWS Security Token Service.
      #
      # @return [Hash]
      attr_reader :credentials

      # The date on which these credentials expire.
      #
      # @return [Time]
      attr_reader :expires_at

      # @api private
      def initialize(opts = {})
        @credentials = opts[:credentials]
        @expires_at = opts[:expires_at]
      end

    end
  end
end
