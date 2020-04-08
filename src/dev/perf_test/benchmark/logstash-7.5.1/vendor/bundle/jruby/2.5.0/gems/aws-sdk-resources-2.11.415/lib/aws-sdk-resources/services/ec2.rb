module Aws
  module EC2

    require 'aws-sdk-resources/services/ec2/instance'

    class Resource

      def create_tags(options)
        resp = @client.create_tags(options)
        tags = []
        options[:resources].each do |resource_id|
          options[:tags].each do |tag|
            tags << Tag.new(resource_id, tag[:key], tag[:value], client: @client)
          end
        end
        Resources::Batch.new(Tag, tags, response: resp)
      end

    end
  end
end
