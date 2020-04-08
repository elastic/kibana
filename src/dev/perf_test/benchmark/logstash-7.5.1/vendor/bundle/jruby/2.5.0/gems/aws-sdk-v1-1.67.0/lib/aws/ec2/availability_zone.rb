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

    # Represents an EC2 availability zone.  You can use this class
    # to get information about the state of an availability zone
    # that is available to your account.
    #
    # @attr_reader [String,nil] region_name Returns the region name
    #   of the availability zone.
    #
    # @attr_reader [Symbol] state Returns the state of the availability
    #   zone, e.g. `:available`.
    #
    # @attr_reader [Array<String>] messages Returns a list of messages about the
    #   Availability Zone.
    #
    class AvailabilityZone < Resource

      # @param [String] name The name of the availability zone.
      def initialize name, options = {}
        @name = name
        if options[:region]
          options[:region_name] = options[:region].name
        end
        super
      end

      # @return [String] Returns the name of the availability zone,
      #   e.g. "us-west-2a".
      attr_reader :name

      alias_method :to_s, :name

      alias_method :to_str, :name

      attribute :region_name, :static => true

      attribute :state, :from => :zone_state, :to_sym => true

      attribute :messages, :from => :message_set do
        translates_output do |messages|
          messages ? messages.collect{|m| m.message } : []
        end
      end

      populates_from(:describe_availability_zones) do |resp|
        resp.availability_zone_info.find {|az| az.zone_name == name }
      end

      # @return [Region] Returns the region of this availability zone.
      def region
        Region.new(self.region_name, :config => config)
      end

      protected
      def describe_call_name
        :describe_availability_zones
      end

      protected
      def inflected_name
        self.class.inflected_name
      end

      protected
      def self.inflected_name
        "zone"
      end

    end

  end
end
