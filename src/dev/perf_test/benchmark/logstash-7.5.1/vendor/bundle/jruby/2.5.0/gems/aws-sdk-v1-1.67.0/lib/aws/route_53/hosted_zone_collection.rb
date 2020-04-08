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

require 'time'

module AWS
  class Route53

    # # Create new hosted zone
    #
    #     r53 = AWS::Route53.new
    #     hosted_zone = r53.hosted_zones.create('example.com.')
    #
    # # Find existing hosted zone
    #
    #     r53 = AWS::Route53.new
    #     # to lookup a route53 hosted zone, you need to use the zone id (i.e hosted_zone.id)
    #     hosted_zone = r53.hosted_zones['Zabcdefghijklm']
    #
    class HostedZoneCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # Find hosted zone by id.
      # @param [String] hosted_zone_id
      # @return [HostedZone]
      def [] hosted_zone_id
        HostedZone.new(hosted_zone_id, :config => config)
      end

      # @param [String] name
      # @option options [String] :comment
      # @option options [String] :caller_reference
      # @return [HostedZone]
      def create name, options = {}
        options[:name] = name
        unless options[:caller_reference]
          options[:caller_reference] = "CreateHostedZone, #{name}, #{Time.now.httpdate}"
        end
        if options[:comment]
          options[:hosted_zone_config] ||= {}
          options[:hosted_zone_config][:comment] = options.delete(:comment)
        end

        resp = client.create_hosted_zone(options)

        change_info = ChangeInfo.new_from(:create_hosted_zone, resp,
          resp[:change_info][:id],
          :config => config)

        HostedZone.new_from(:create_hosted_zone, resp,
          resp[:hosted_zone][:id],
          :change_info => change_info,
          :config => config)

      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options = @filters.merge(options)

        options[:marker] = next_token if next_token
        options[:max_items] = limit if limit

        resp = client.list_hosted_zones(options)
        resp.data[:hosted_zones].each do |details|
          hosted_zone = HostedZone.new_from(
            :list_hosted_zones,
            details,
            details[:id],
            :config => config)

          yield(hosted_zone)

        end

        resp.data[:next_marker]

      end

    end
  end
end
