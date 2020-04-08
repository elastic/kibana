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
  class Route53

    # # Modify resource record set
    #
    #     rrsets = AWS::Route53::HostedZone.new(hosted_zone_id).rrsets
    #     rrset = rrsets['foo.example.com.', 'A']
    #     rrset.ttl = 3600
    #     rrset.update
    #
    # # Delete existing resource record set
    #
    #     rrsets = AWS::Route53::HostedZone.new(hosted_zone_id).rrsets
    #     rrset = rrsets['foo.example.com.', 'A']
    #     rrset.delete
    #
    # @attr_reader [Hash] alias_target
    #
    # @attr_reader [Integer] weight
    #
    # @attr_reader [String] region
    #
    # @attr_reader [Integer] ttl
    #
    # @attr_reader [Array<Hash>] resource_records
    #
    class ResourceRecordSet < Core::Resource

      # @api private
      def initialize name, type, options = {}
        @name = name
        @type = type
        @set_identifier = options[:set_identifier]
        @hosted_zone_id = options[:hosted_zone_id]
        @change_info = options[:change_info]
        @create_options = {}
        super
      end

      # @return [String] The hosted zone ID.
      attr_reader :hosted_zone_id

      # @return [ChangeInfo]
      attr_reader :change_info

      # @return [String] name
      attr_reader :name

      # @param [String] new_name
      # @return [String]
      def name= new_name
        @create_options[:name] = new_name
      end

      # @return [String]
      attr_reader :type

      # @param [String] new_type
      # @return [String]
      def type= new_type
        @create_options[:type] = new_type
      end

      # @return [String]
      attr_reader :set_identifier

      alias_method :identifier, :set_identifier

      # @param [String] new_identifier
      # @return [String]
      def set_identifier= new_identifier
        @create_options[:set_identifier] = new_identifier
      end

      alias_method :identifier=, :set_identifier=

      attribute :alias_target

      # @param [Hash] new_target
      # @return [Hash]
      def alias_target= new_target
        @create_options[:alias_target] = new_target
      end

      attribute :weight

      # @param [Integer] new_weight
      # @return [Integer]
      def weight= new_weight
        @create_options[:weight] = new_weight
      end

      attribute :region

      # @param [String] new_region
      # @return [String]
      def region= new_region
        @create_options[:region] = new_region
      end

      attribute :ttl

      # @param [Integer] new_ttl
      # @return [Integer]
      def ttl= new_ttl
        @create_options[:ttl] = new_ttl
      end

      attribute :geo_location

      def geo_location= new_geo_location
        @create_options[:geo_location] = new_geo_location
      end

      attribute :failover

      def failover= new_failover
        @create_options[:failover] = new_failover
      end

      attribute :health_check_id

      def health_check_id= new_health_check_id
        @create_options[:health_check_id] = new_health_check_id
      end

      attribute :resource_records

      # @param [Array<Hash>] new_rrs
      # @return [Array<Hash>]
      def resource_records= new_rrs
        @create_options[:resource_records] = new_rrs
      end

      populates_from :list_resource_record_sets do |resp|
        resp[:resource_record_sets].find { |details|
          if set_identifier
            details[:name] == name and details[:type] == type and details[:set_identifier] == set_identifier
          else
            details[:name] == name and details[:type] == type
          end
        }
      end

      # @return [Boolean] Returns `true` if this rrset exists.
      def exists?
        !get_resource.data[:resource_record_sets].find { |details|
          if set_identifier
            details[:name] == name and details[:type] == type and details[:set_identifier] == set_identifier
          else
            details[:name] == name and details[:type] == type
          end
        }.nil?
      end

      # Update values of resource record set.
      # @param [Hash] options Options for change batch.
      # @return [ResourceRecordSet] New resource record set with current value.
      def update options = {}
        batch = new_change_batch(options)
        AWS.memoize do
          batch << new_delete_request
          batch << new_create_request
        end

        @change_info = batch.call()
        @name = @create_options[:name] || @name
        @type = @create_options[:type] || @type
        @set_identifier = @create_options[:set_identifier] || @set_identifier
        @create_options = {}
        self
      end

      # Delete resource record set.
      # @param [Hash] options Options for change batch.
      # @return [ChangeInfo]
      def delete options = {}
        batch = new_change_batch(options)
        batch << new_delete_request

        change_info = batch.call()
      end

      # Return a new change batch for this hosted zone.
      # @param [Hash] options Options for change batch.
      # @return [ChangeBatch]
      def new_change_batch options = {}
        ChangeBatch.new(hosted_zone_id, options.merge(:config => config))
      end

      # Return the create request that #update would include in its change
      # batch. Note that #update also includes a delete request.
      # @return [CreateRequest]
      def new_create_request
        create_options = delete_options.merge(@create_options)
        CreateRequest.new(create_options[:name], create_options[:type],
                          create_options)
      end

      # Return a delete request that would delete this resource record set.
      # @return [DeleteRequest]
      def new_delete_request
        options = delete_options
        DeleteRequest.new(options[:name], options[:type], options)
      end

      protected

      def resource_identifiers
        [[:name, name], [:type, type], [:set_identifier, set_identifier]]
      end

      def get_resource attr_name = nil
        options = {}
        options[:start_record_name] = name
        options[:start_record_type] = type
        options[:start_record_identifier] = set_identifier if set_identifier
        options[:hosted_zone_id] = hosted_zone_id

        client.list_resource_record_sets(options)
      end

      private

      # Format a hash of options that can be used to initialize a change
      # request.
      # @return [Hash]
      def delete_options
        options = {:name => name, :type => type}
        AWS.memoize do
          options[:set_identifier] = set_identifier if set_identifier
          options[:alias_target] = alias_target if alias_target
          options[:weight] = weight if weight
          options[:region] = region if region
          options[:ttl] = ttl if ttl
          options[:resource_records] = resource_records if resource_records && !resource_records.empty?
          options[:geo_location] = geo_location if geo_location
          options[:failover] = failover if failover
          options[:health_check_id] = health_check_id if health_check_id
        end
        options
      end
    end
  end
end
