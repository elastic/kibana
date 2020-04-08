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
    class VPNConnection < Resource
      class Telemetry

        def initialize vpn_connection, details
          @vpn_connection = vpn_connection
          @outside_ip_address = details.outside_ip_address
          @status = details.status.downcase.to_sym
          @last_status_change = details.last_status_change
          @status_message = details.status_message
          @accepted_route_count = details.accepted_route_count
        end

        # @return [VPNConnection]
        attr_reader :vpn_connection

        # @return [String]
        attr_reader :outside_ip_address

        # @return [Symbol] :up or :down
        attr_reader :status

        # @return [Time]
        attr_reader :last_status_change

        # @return [String]
        attr_reader :status_message

        # @return [Integer]
        attr_reader :accepted_route_count

      end
    end
  end
end
