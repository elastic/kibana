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
  class ELB

    # A collection that help maanage the availability zones for
    # a load balancer.
    #
    #     load_balancer = AWS::ELB.new.load_balancers['my-load-balancer']
    #
    #     zones = load_balancer.availability_zones
    #
    #     # adding zones
    #     zones.enable('us-west-2b', 'us-west-2c')
    #
    #     # removing zones
    #     zones.disable('us-west-2b')
    #
    #     # enumerating enabled zones
    #     zones.each do |zone|
    #       puts zone.name
    #     end
    #
    class AvailabilityZoneCollection

      include Core::Collection::Simple

      # @param [LoadBalancer] load_balancer The load balancer this list of
      #   availability zones belongs to.
      def initialize load_balancer, options = {}
        @load_balancer = load_balancer
        super
      end

      # @return [LoadBalancer] Returns the load balancer this list describes.
      attr_reader :load_balancer

      # Adds one or more EC2 Availability Zones to the load balancer.
      #
      #     load_balancer.availability_zones.enable("us-west-2a", "us-west-2b")
      #
      # You can also pass {EC2::AvailabilityZone} objects:
      #
      #     # enable all availabilty zones for this region
      #     zones = AWS::EC2.new.availability_zones.to_a
      #     load_balancer.availability_zones.enable(zones)
      #
      # The load balancer evenly distributes requests across all its
      # registered availability zones that contain instances. As a result,
      # the client must ensure that its load balancer is appropriately
      # scaled for each registered Availability Zone.
      #
      # @param [String,EC2::AvailabilityZone] availability_zones One or more
      #   availability zone names (strings) or objects {EC2::AvailabilityZone}.
      #
      # @return [nil]
      #
      def enable *availability_zones

        names = availability_zones.flatten.collect do |av|
          av.is_a?(EC2::AvailabilityZone) ? av.name : av.to_s
        end

        client.enable_availability_zones_for_load_balancer(
          :load_balancer_name => load_balancer.name,
          :availability_zones => names)

        nil

      end

      # Removes the specified EC2 availability zones from the set of
      # configured availability zones for the load balancer.
      #
      #     load_balancer.availability_zones.disable("us-west-2a", "us-west-2b")
      #
      # You can also pass {EC2::AvailabilityZone} objects:
      #
      #     # disable all availabilty zones
      #     zones = AWS::EC2.new.availability_zones.to_a
      #     load_balancer.availability_zones.disable(zones)
      #
      # There must be at least one availability zone registered with a
      # load balancer at all times. A client cannot remove all the availability
      # zones from a load balancer. Once an availability zone is removed,
      # all the instances registered with the load balancer that are in the
      # removed availability zone go into the out of service state.
      #
      # Upon availability zone removal, the load balancer attempts to
      # equally balance the traffic among its remaining usable availability
      # zones. Trying to remove an availability zone that was not
      # associated with the load balancer does nothing.
      #
      # @param [String,EC2::AvailabilityZone] availability_zones One or more
      #   availability zone names (strings) or objects {EC2::AvailabilityZone}.
      #
      # @return [nil]
      #
      def disable *availability_zones

        names = availability_zones.flatten.collect do |av|
          av.is_a?(EC2::AvailabilityZone) ? av.name : av.to_s
        end

        client.disable_availability_zones_for_load_balancer(
          :load_balancer_name => load_balancer.name,
          :availability_zones => names)

        nil

      end

      protected
      def _each_item options = {}, &block
        load_balancer.availability_zone_names.each do |az_name|

          availability_zone = EC2::AvailabilityZone.new(
            az_name, :config => config)

          yield(availability_zone)

        end
      end

    end
  end
end
