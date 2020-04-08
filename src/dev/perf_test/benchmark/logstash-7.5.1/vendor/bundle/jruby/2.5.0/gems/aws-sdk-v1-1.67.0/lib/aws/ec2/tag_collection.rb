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

    # Temporary class that will be removed once the rest of the taggable
    # EC2 resources have been modeled.
    class ResourceObject < Resource

      def initialize id, options = {}
        @id = id
        @resource_type = options[:resource_type]
        super
      end

      attr_reader :id

      include TaggedItem

      # @api private
      def tagging_resource_type
        @resource_type
      end

      # @api private
      # We don't know how to make a describe call for this object yet
      def cached_tags; nil; end

    end

    # Represents all EC2 tags in an account.
    class TagCollection < Collection

      # Creates a new Tag and assigns it to an EC2 resource.
      #
      # @example tagging with names (keys) only
      #
      #   ec2.tags.create(instance, 'webserver')
      #
      # @example tagging with names (keys) and values
      #
      #   ec2.tags.create(instance, 'stage', :value => 'production')
      #
      # @param [Object] resource The item to tag.  This should be a taggable
      #   EC2 resource, like an instance, security group, etc.
      # @param [String] key The tag key (or name).
      # @param [Hash] options
      # @option optins [String] :value ('') The optional tag value.  When
      #   left blank its assigned the empty string.
      # @return [Tag]
      def create resource, key, options = {}
        value = options[:value].to_s
        client.create_tags(
          :resources => [resource.id],
          :tags => [{ :key => key, :value => value }])
        Tag.new(resource, key, :value => value, :config => config)
      end

      # @return [Tag] Returns a reference to a tag with the given name.
      def [] tag_name
        super
      end

      # Yields once for each tag.
      # @yield [tag]
      # @yieldparam [Tag] tag
      # @return [nil]
      def each &block
        response = filtered_request(:describe_tags)
        response.tag_set.each do |tag|

          resource_class_name = Core::Inflection.class_name(tag.resource_type)
          if EC2.const_defined?(resource_class_name)
            resource_class = EC2.const_get(resource_class_name)
            resource = resource_class.new(tag.resource_id, :config => config)
          else
            resource = ResourceObject.new(tag.resource_id,
                                          :resource_type => tag.resource_type,
                                          :config => config)
          end

          yield(Tag.new(resource, tag.key))

        end
        nil
      end

      # @api private
      protected
      def member_class
        Tag
      end

    end
  end
end
