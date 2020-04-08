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

      # Represents a branch in an {S3::Tree}.  From a branch node you
      # can descend deeper into the tree using {Parent#children} or go
      # back to the parent node using {#parent}.
      #
      # When enumerating nodes in an S3 tree keys grouped by a common
      # prefix are represented as a branch node.
      #
      # Branch nodes are often treated like directories.
      #
      # @see Tree
      # @note Generally you do not need to create branch nodes.
      class BranchNode < Node

        include Parent

        # @api private
        def initialize parent, collection, options = {}
          @parent = parent
          super(collection,
                options.merge(:prefix => collection.prefix))
        end

        # @return [Tree, BranchNode] The parent node in the tree.
        attr_reader :parent

        # @return [true]
        def branch?
          true
        end

        # @return [false]
        def leaf?
          false
        end

        # Returns a new Tree object that starts at this branch node.
        # The returned tree will have the same prefix, delimiter and
        # append mode as the tree the branch belongs to.
        #
        # @return [Tree]
        def as_tree
          Tree.new(collection,
                   :prefix => prefix,
                   :delimiter => delimiter,
                   :append => append?)
        end

      end
    end
  end
end
