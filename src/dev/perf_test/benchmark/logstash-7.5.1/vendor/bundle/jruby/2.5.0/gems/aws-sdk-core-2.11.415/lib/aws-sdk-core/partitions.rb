module Aws

  # A {Partition} is a group of AWS {Region} and {Service} objects. You
  # can use a partition to determine what services are available in a region,
  # or what regions a service is available in.
  #
  # ## Partitions
  #
  # **AWS accounts are scoped to a single partition**. You can get a partition
  # by name. Valid partition names include:
  #
  # * `"aws"` - Public AWS partition
  # * `"aws-cn"` - AWS China
  # * `"aws-us-gov"` - AWS GovCloud
  #
  # To get a partition by name:
  #
  #     aws = Aws.partition('aws')
  #
  # You can also enumerate all partitions:
  #
  #     Aws.partitions.each do |partition|
  #       puts partition.name
  #     end
  #
  # ## Regions
  #
  # A {Partition} is divided up into one or more regions. For example, the
  # "aws" partition contains, "us-east-1", "us-west-1", etc. You can get
  # a region by name. Calling {Partition#region} will return an instance
  # of {Region}.
  #
  #     region = Aws.partition('aws').region('us-east-1')
  #     region.name
  #     #=> "us-east-1"
  #
  # You can also enumerate all regions within a partition:
  #
  #     Aws.partition('aws').regions.each do |region|
  #       puts region.name
  #     end
  #
  # Each {Region} object has a name, description and a list of services
  # available to that region:
  #
  #     us_west_2 = Aws.partition('aws').region('us-west-2')
  #
  #     us_west_2.name #=> "us-west-2"
  #     us_west_2.description #=> "US West (Oregon)"
  #     us_west_2.partition_name "aws"
  #     us_west_2.services #=> #<Set: {"APIGateway", "AutoScaling", ... }
  #
  # To know if a service is available within a region, you can call `#include?`
  # on the set of service names:
  #
  #     region.services.include?('DynamoDB') #=> true/false
  #
  # The service name should be the service's module name as used by
  # the AWS SDK for Ruby. To find the complete list of supported
  # service names, see {Partition#services}.
  #
  # Its also possible to enumerate every service for every region in
  # every partition.
  #
  #     Aws.partitions.each do |partition|
  #       partition.regions.each do |region|
  #         region.services.each do |service_name|
  #           puts "#{partition.name} -> #{region.name} -> #{service_name}"
  #         end
  #       end
  #     end
  #
  # ## Services
  #
  # A {Partition} has a list of services available. You can get a
  # single {Service} by name:
  #
  #     Aws.partition('aws').service('DynamoDB')
  #
  # You can also enumerate all services in a partition:
  #
  #     Aws.partition('aws').services.each do |service|
  #       puts service.name
  #     end
  #
  # Each {Service} object has a name, and information about regions
  # that service is available in.
  #
  #     service.name #=> "DynamoDB"
  #     service.partition_name #=> "aws"
  #     service.regions #=> #<Set: {"us-east-1", "us-west-1", ... }
  #
  # Some services have multiple regions, and others have a single partition
  # wide region. For example, {Aws::IAM} has a single region in the "aws"
  # partition. The {Service#regionalized?} method indicates when this is
  # the case.
  #
  #     iam = Aws.partition('aws').service('IAM')
  #
  #     iam.regionalized? #=> false
  #     service.partition_region #=> "us-east-1"
  #
  # Its also possible to enumerate every region for every service in
  # every partition.
  #
  #     Aws.partitions.each do |partition|
  #       partition.services.each do |service|
  #         service.regions.each do |region_name|
  #           puts "#{partition.name} -> #{region_name} -> #{service.name}"
  #         end
  #       end
  #     end
  #
  # ## Service Names
  #
  # {Service} names are those used by the the AWS SDK for Ruby. They
  # correspond to the service's module.
  #
  module Partitions

    autoload :Partition, 'aws-sdk-core/partitions/partition'
    autoload :PartitionList, 'aws-sdk-core/partitions/partition_list'
    autoload :Region, 'aws-sdk-core/partitions/region'
    autoload :Service, 'aws-sdk-core/partitions/service'

    class << self

      # @param [Hash] new_partitions
      # @api private
      def add(new_partitions)
        new_partitions['partitions'].each do |partition|
          default_list.add_partition(Partition.build(partition))
          defaults['partitions'] << partition
        end
      end

      # @api private
      def clear
        default_list.clear
        defaults['partitions'].clear
      end

      # @return [Hash]
      # @api private
      def defaults
        @defaults ||= begin
          path = File.join(File.dirname(__FILE__), '..', '..', 'endpoints.json')
          Aws::Json.load_file(path)
        end
      end

      # @return [PartitionList]
      # @api priviate
      def default_list
        @default_list ||= PartitionList.build(defaults)
      end

      # @return [Hash<String,String>] Returns a map of service module names
      #   to their id as used in the endpoints.json document.
      # @api private
      def service_ids
        @service_ids ||= begin
          services = "#{File.dirname(__FILE__)}/../../service-models.json"
          services = Aws::Json.load_file(services)
          services.inject({}) do |ids, (name, svc)|
            ids[name] = svc['endpoint'] #if svc['endpoint']
            ids
          end
        end
      end

    end
  end
end
