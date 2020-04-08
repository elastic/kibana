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

      # Common methods for tree nodes that are parents to other nodes
      # ({Tree} and {BranchNode}).
      module Parent

        include Core::Model

        # @api private
        def initialize collection, options = {}

          options = {
            :prefix => nil,
            :delimiter => '/',
            :append => true,
          }.merge(options)

          @collection = collection
          @prefix = options[:prefix]
          @delimiter = options[:delimiter]
          @append = options[:append]

          super

        end

        # @return [ObjectCollection, BucketVersionCollection,
        #   MultipartUploadCollection] The collection whose members
        #   will be explored using the tree.
        attr_reader :collection

        # A tree may have a prefix of where in the bucket to be based
        # from.  A value of `nil` means that the tree will include all
        # objects in the collection.
        #
        # @return [String,nil]
        attr_reader :prefix

        # When looking at S3 keys as a tree, the delimiter defines what
        # string pattern seperates each level of the tree.  The delimiter
        # defaults to '/' (like in a file system).
        #
        # @return [String]
        attr_reader :delimiter

        # @return [Boolean] Returns true if the tree is set to auto-append
        #   the delimiter to the prefix when the prefix does not end with
        #   the delimiter.
        def append?
          @append
        end

        # @return [Tree::ChildCollection] A collection representing all
        #   the child nodes of this node.  These may be either
        #   {Tree::BranchNode} objects or {Tree::LeafNode} objects.
        def children
          Tree::ChildCollection.new(self, collection,
                                    :delimiter => delimiter,
                                    :prefix => prefix,
                                    :append => append?)
        end

        def inspect
          "<#{self.class}:#{collection.bucket.name}:#{prefix}>"
        end

      end

    end
  end
end
