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

    # A utility class that supports exploring an S3 {Bucket} like a
    # tree.
    #
    # Frequently objects stored in S3 have keys that look like a filesystem
    # directory structure.
    #
    # Given you have a bucket with the following keys:
    #
    #     README.txt
    #     videos/wedding.mpg
    #     videos/family_reunion.mpg
    #     photos/2010/house.jpg
    #     photos/2011/fall/leaves.jpg
    #     photos/2011/summer/vacation.jpg
    #     photos/2011/summer/family.jpg
    #
    # You might like to explore the contents of this bucket as a tree:
    #
    #     tree = bucket.as_tree
    #
    #     directories = tree.children.select(&:branch?).collect(&:prefix)
    #     #=> ['photos', 'videos']
    #
    #     files = tree.children.select(&:leaf?).collect(&:key)
    #     #=> ['README.txt']
    #
    # If you want to start further down, pass a prefix to {Bucket#as_tree}:
    #
    #     tree = bucket.as_tree(:prefix => 'photos/2011')
    #
    #     directories = tree.children.select(&:branch?).collect(&:prefix)
    #     #=> ['photos/2011/fall', 'photos/2011/summer']
    #
    #     files = tree.children.select(&:leaf?).collect(&:key)
    #     #=> []
    #
    # All non-leaf nodes ({Tree} and {Tree::BranchNode} instances)
    # have a {Tree::Parent#children} method that provides access to
    # the next level of the tree, and all nodes ({Tree},
    # {Tree::BranchNode}, and {Tree::LeafNode}) have a {#parent}
    # method that returns the parent node.  In our examples above, the
    # non-leaf nodes are common prefixes to multiple keys
    # (directories) and leaf nodes are object keys.
    #
    # You can continue crawling the tree using the `children`
    # collection on each branch node, which will contain the branch
    # nodes and leaf nodes below it.
    #
    # You can construct a Tree object using the `as_tree` method of
    # any of the following classes:
    #
    # * {Bucket} or {ObjectCollection} (for {S3Object} leaf nodes)
    #
    # * {BucketVersionCollection} (for {ObjectVersion} leaf nodes)
    #
    # * {MultipartUploadCollection} (for {MultipartUpload} leaf nodes)
    #
    # The methods to explore the tree are the same for each kind of
    # leaf node, but {Tree::LeafNode#member} will return a different
    # type of object depending on which kind of collection the tree is
    # using.
    class Tree

      autoload :BranchNode, 'aws/s3/tree/branch_node'
      autoload :ChildCollection, 'aws/s3/tree/child_collection'
      autoload :LeafNode, 'aws/s3/tree/leaf_node'
      autoload :Node, 'aws/s3/tree/node'
      autoload :Parent, 'aws/s3/tree/parent'

      include Parent

      # @param [ObjectCollection, BucketVersionCollection,
      #   MultipartUploadCollection] collection The collection whose
      #   members will be explored using the tree.
      #
      # @param [Hash] options Additional options for constructing the
      #   tree.
      #
      # @option options [String] :prefix (nil) Set prefix to choose
      #   where the top of the tree will be.  A value of `nil` means
      #   that the tree will include all objects in the collection.
      #
      # @option options [String] :delimiter ('/') The string that
      #   separates each level of the tree.  This is usually a
      #   directory separator.
      #
      # @option options [Boolean] :append (true) If true, the delimiter is
      #   appended to the prefix when the prefix does not already end
      #   with the delimiter.
      def initialize collection, options = {}
        super
      end

      # @return The parent node in the tree.  In the case of a Tree,
      #   the parent is always nil.
      def parent; nil; end

    end
  end
end
