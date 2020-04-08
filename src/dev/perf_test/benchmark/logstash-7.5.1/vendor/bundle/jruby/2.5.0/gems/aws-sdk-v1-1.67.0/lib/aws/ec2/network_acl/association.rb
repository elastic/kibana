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
  class EC2
    class NetworkACL < Resource

      # Represents the association between a {NetworkACL} and a {Subnet}.
      class Association

        def initialize association_id, network_acl, subnet
          @association_id = association_id
          @network_acl = network_acl
          @subnet = subnet
        end

        # @return [String] An identifier representing the association
        #   between the network ACL and subnet.
        attr_reader :association_id

        # @return [NetworkACL]
        attr_reader :network_acl

        # @return [Subnet]
        attr_reader :subnet

        # Replaces the network acl in the current association with a
        # different one (a new network acl is assigned to the subnet).
        #
        # @param [NetworkACL,String] network_acl A {NetworkACL} object or
        #   a network acl id (string).
        #
        # @return [nil]
        #
        def replace_network_acl network_acl
          acl_id = network_acl.is_a?(NetworkACL) ? network_acl.id : network_acl
          subnet.client.replace_network_acl_association(
            :association_id => association_id,
            :network_acl_id => acl_id)
          nil
        end

      end
    end
  end
end
