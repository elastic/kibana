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

    # Represents an EC2 tag.
    # @attr [String] value The tag value.
    class Tag < Resource

      # @param [String] key The name of the tag
      # @param [Hash] options
      # @option options [String] :value ('') The optional value of the tag.
      def initialize resource, key, options = {}
        @resource = resource
        @key = key.to_s
        super
      end

      # @return [Object] The EC2 resource this tag belongs to.
      attr_reader :resource

      # @return [String] The name of this tag.
      attr_reader :key

      alias_method :name, :key

      attribute :value

      populates_from(:describe_tags) do |resp|
        resp.tag_index[response_index_key]
      end

      # Deletes this tag.
      # @return [nil]
      def delete(value = nil)
        tag_opts = { :key => key }
        tag_opts[:value] = value if value
        client.delete_tags(:resources => [resource.id], :tags => [tag_opts])
        nil
      end

      # @api private
      def inspect
        "<#{self.class}:#{local_cache_key}>"
      end

      # @api private
      def local_cache_key
        response_index_key
      end

      private
      def response_index_key
        type = resource.tagging_resource_type
        id = resource.send(:__resource_id__)
        "#{type}:#{id}:#{key}"
      end

      protected
      def get_resource attr
        client.describe_tags(:filters => [
          { :name => "key", :values => [key] },
          { :name => "resource-type", :values => [resource.tagging_resource_type] },
          { :name => "resource-id", :values => [resource.send(:__resource_id__)] }
        ])
      end

    end
  end
end
