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
    module TaggedItem

      # Adds a single tag with an optional tag value.
      #
      #     # adds a tag with the key production
      #     resource.tag('production')
      #
      #     # adds a tag with the optional value set to production
      #     resource.tag('role', :value => 'webserver')
      #
      # @param [String] key The name of the tag to add.
      # @param [Hash] options
      # @option options [String] :value An optional tag value.
      # @return [Tag] The tag that was created.
      def add_tag key, options = {}
        client.create_tags({
          :resources => [id],
          :tags => [{ :key => key, :value => options[:value].to_s }],
        })
        Tag.new(self, key, options.merge(:config => config))
      end
      alias_method :tag, :add_tag

      # Deletes all tags associated with this EC2 resource.
      # @return [nil]
      def clear_tags
        client.delete_tags(:resources => [self.id])
        nil
      end

      # Returns a collection that represents only tags belonging to
      # this resource.
      #
      # @example Manipulating the tags of an EC2 instance
      #   i = ec2.instances["i-123"]
      #   i.tags.to_h                  # => { "foo" => "bar", ... }
      #   i.tags.clear
      #   i.tags.stage = "production"
      #   i.tags.stage                 # => "production"
      #
      # @return [ResourceTagCollection] A collection of tags that
      #   belong to this resource.
      #
      def tags
        ResourceTagCollection.new(self, :config => config)
      end

      # @api private
      def cached_tags
        if cache = AWS.response_cache
          cache.select(describe_call_name.to_sym).each do |resp|
            if obj = find_in_response(resp)
              return obj.tag_set.inject({}) do |hash, tag|
                hash[tag.key] = tag.value
                hash
              end
            end
          end
        end
        nil
      end

      # @api private
      def tagging_resource_type
        Core::Inflection.ruby_name(self.class.to_s).tr("_","-")
      end

    end
  end
end
