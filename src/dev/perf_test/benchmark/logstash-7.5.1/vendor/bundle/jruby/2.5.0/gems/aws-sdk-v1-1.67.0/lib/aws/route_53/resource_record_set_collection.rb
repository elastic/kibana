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

    # # Create new resource record set
    #
    #     rrsets = AWS::Route53::HostedZone.new(hosted_zone_id).rrsets
    #     rrset = rrsets.create('foo.example.com.', 'A', :ttl => 300, :resource_records => [{:value => '127.0.0.1'}])
    #
    # # Find existing resource record set
    #
    #     rrsets = AWS::Route53::HostedZone.new(hosted_zone_id).rrsets
    #     rrset = rrsets['foo.example.com.', 'A']
    #
    class ResourceRecordSetCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize hosted_zone_id, options = {}
        @hosted_zone_id = hosted_zone_id
        @filters = options[:filters] || {}
        super
      end

      # @return [String]
      attr_reader :hosted_zone_id

      # Find resource record set by its name, type and identifier.
      # @param [String] name
      # @param [String] type
      # @param [String] set_identifier
      # @return [ResourceRecordSet]
      def [] name, type, set_identifier = nil
        ResourceRecordSet.new(name, type, :set_identifier => set_identifier, :hosted_zone_id => hosted_zone_id, :config => config)
      end

      # Create new resource record set.
      # @param [String] name
      # @param [String] type
      # @param [Hash] options
      # @return [ResourceRecordSet]
      def create name, type, options = {}
        batch = ChangeBatch.new(hosted_zone_id, :comment => options[:comment], :config => config)
        batch << CreateRequest.new(name, type, options)

        change_info = batch.call()
        if change_info
          ResourceRecordSet.new(name,
                                type,
                                :set_identifier => options[:set_identifier],
                                :change_info => change_info,
                                :hosted_zone_id => hosted_zone_id,
                                :config => config)
        end
      end

      private

      def _each_item next_token, limit, options = {}, &block

        options = @filters.merge(options)

        options[:start_record_name] = next_token[:next_record_name] if next_token and next_token[:next_record_name]
        options[:start_record_type] = next_token[:next_record_type] if next_token and next_token[:next_record_type]
        options[:start_record_identifier] = next_token[:next_record_identifier] if next_token and next_token[:next_record_identifier]
        options[:maxitems] = limit if limit

        options[:hosted_zone_id] = hosted_zone_id

        resp = client.list_resource_record_sets(options)
        resp.data[:resource_record_sets].each do |details|
          rrset = ResourceRecordSet.new_from(
            :list_resource_record_sets,
            details,
            details[:name],
            details[:type],
            :set_identifier => details[:set_identifier],
            :hosted_zone_id => hosted_zone_id, :config => config)

          yield(rrset)

        end

        if resp.data[:is_truncated]
          {
            :next_record_name => resp.data[:next_record_name],
            :next_record_type => resp.data[:next_record_type],
            :next_record_identifier => resp.data[:next_record_identifier],
          }
        end
      end

    end
  end
end
