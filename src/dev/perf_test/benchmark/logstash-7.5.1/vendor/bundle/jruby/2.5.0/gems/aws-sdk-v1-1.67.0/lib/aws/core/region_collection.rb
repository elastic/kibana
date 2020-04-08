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

require 'uri'
require 'net/http'
require 'json'

module AWS
  module Core

    # Provides a mechnasim to discover available regions.  This can useful if
    # you want to perform an operation for a service in every region.
    #
    #   # call the EC2 DescribeInstances operation in each region
    #   AWS.regions.each do |region|
    #     resp = region.ec2.client.describe_instances
    #   end
    #
    # You can also use this collection as a shortcut for creating
    # a service interface with a given region.
    #
    #   s3 = AWS.regions['us-west-1'].s3
    #
    # This collection enumerates and returns {Region} objects.
    #
    # @see Region
    class RegionCollection

      include Enumerable

      # @option options [Configuration] :config (AWS.config)
      # @option options [ServiceInterface] :service (nil)
      # @api private
      def initialize options = {}
        @config = options[:config] || AWS.config
        @service = options[:service]
      end

      # @return [Configuration]
      attr_reader :config

      # @param [String] name
      # @return [Region] Returns a {Region} with the given name.
      def [] name
        Region.new(name, :config => config)
      end

      # Enumerates public regions (non US Gov regions).
      # @yieldparam [region] Region
      def each &block
        public_regions.each do |region_name|
          yield(self[region_name])
        end
      end

      private

      # @return [Array<String>] Returns an array of non-gov-cloud region names.
      def public_regions
        return ['us-east-1'] if @service and @service.global_endpoint?
        data = Endpoints.endpoints
        regions = @service ?
          data['services'][@service.endpoint_prefix] :
          data['regions'].keys
        regions.reject{ |r| r =~ /us-gov/ }.reject{ |r| r =~ /^cn-/ }
      end

    end
  end
end
