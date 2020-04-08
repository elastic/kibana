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
  class S3
    class Tree

      class ChildCollection

        include Core::Model
        include Enumerable

        # @api private
        def initialize parent, collection, options = {}

          options = {
            :prefix => nil,
            :delimiter => '/',
            :append => true,
          }.merge(options)

          @parent = parent
          @collection = collection
          @prefix = options[:prefix]
          @delimiter = options[:delimiter]
          @append = options[:append]

          super

        end

        # @return [Tree, BranchNode] The parent node in the tree.
        attr_reader :parent

        # @return [ObjectCollection, ObjectVersionCollection,
        #   MultipartUploadCollection] Returns the collection this
        #   tree is based on.
        attr_reader :collection

        # A tree may have a prefix of where in the bucket to be based from.
        # @return [String,nil]
        attr_reader :prefix

        # When looking at S3 keys as a tree, the delimiter defines what
        # string pattern seperates each level of the tree.  The delimiter
        # defaults to '/' (like in a file system).
        # @return [String]
        attr_reader :delimiter

        # @return [Boolean] Returns true if the tree is set to auto-append
        #   the delimiter to the prefix when the prefix does not end with
        #   the delimiter.
        def append?
          @append
        end

        # Yields up branches and leaves.
        #
        # A branch node represents a common prefix (like a directory)
        # and a leaf node represents a key (S3 object).
        #
        # @yield [tree_node] Yields up a mixture of branches and leafs.
        # @yieldparam [BranchNode,LeafNode] tree_node A branch or a leaf.
        # @return [nil]
        def each &block
          collection = self.collection
          if prefix = prefix_with_delim
            collection = collection.with_prefix(prefix)
          end
          collection.each(:delimiter => delimiter) do |member|
            case
            when member.respond_to?(:key)
              yield LeafNode.new(parent, member)
            when member.respond_to?(:prefix)
              yield BranchNode.new(parent, member,
                                   :delimiter => delimiter,
                                   :append => append?)
            end
          end
          nil
        end

        protected
        def prefix_with_delim
          return prefix unless append?
          return nil if prefix.nil?
          prefix =~ /#{delimiter}$/ ? prefix : "#{prefix}#{delimiter}"
        end

      end

    end
  end
end
