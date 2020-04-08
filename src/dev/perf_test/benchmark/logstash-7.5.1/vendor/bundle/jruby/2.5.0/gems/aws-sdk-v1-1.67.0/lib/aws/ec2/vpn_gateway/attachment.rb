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
    class VPNGateway < Resource
      class Attachment

        # @api private
        def initialize vpn_gateway, details
          @vpn_gateway = vpn_gateway
          @vpc = VPC.new(details.vpc_id, :config => vpn_gateway.config)
          @state = details.state.to_sym
        end

        # @return [VPNGateway]
        attr_reader :vpn_gateway

        # @return [VPC]
        attr_reader :vpc

        # @return [Symbol]
        attr_reader :state

        # Deletes this attachment.
        # @return (see VPNGateway#detach)
        def delete
          vpn_gateway.detach(vpc)
        end
        alias_method :detach, :delete

      end
    end
  end
end
