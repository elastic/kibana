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

    # Represents all EC2 availability zones that are currently
    # available to your account.
    class AvailabilityZoneCollection < Collection

      # Yields each of the EC2 availability zones.
      # @return [nil]
      def each &block
        resp = filtered_request(:describe_availability_zones)
        resp.availability_zone_info.each do |az|
          zone = AvailabilityZone.new(az.zone_name,
            :region_name => az.region_name,
            :config => config)
          yield(zone)
        end
        nil
      end

      # @api private
      protected
      def member_class
        AvailabilityZone
      end

    end

  end
end
