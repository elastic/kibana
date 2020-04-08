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
  class IAM

    # Client class for AWS Identity and Access Management (IAM).
    class Client < Core::QueryClient

      API_VERSION = '2010-05-08'

      signature_version :Version4, 'iam'

      # @api private
      CACHEABLE_REQUESTS = Set[
        :get_group,
        :get_group_policy,
        :get_instance_profile,
        :get_role_policy,
        :list_groups,
        :list_group_policies,
        :list_groups_for_user,
        :list_instance_profiles,
        :list_instance_profiles_for_role,
        :list_role_policies,
        :list_roles,
        :list_server_certificates,
        :list_virtual_mfa_devices,
      ]

    end

    class Client::V20100508 < Client

      define_client_methods('2010-05-08')

    end
  end
end
