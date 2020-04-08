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

      # Represents a leaf in an {S3::Tree}.
      #
      # When enumerating nodes in an S3 tree, keys are yielded
      # as leaf nodes (they have no children beneath them).
      #
      # @see Tree
      # @note Generally you do not need to create leaf nodes
      class LeafNode < Node

        # @api private
        def initialize parent, member
          @parent = parent
          @member = member
          super()
        end

        # @return [Tree, BranchNode] The parent node in the tree.
        attr_reader :parent

        # @return [mixed] Returns the object this leaf node represents.
        # @see #object
        # @see #version
        # @see #upload
        attr_reader :member

        # @return [String] the key this leaf node represents.
        def key
          @member.key
        end

        # @return [false]
        def branch?
          false
        end

        # @return [true]
        def leaf?
          true
        end

        # @return [S3Object] The object this leaf node represents.
        def object
          if @member.kind_of?(S3Object)
            @member
          else
            @member.object
          end
        end

        # @return [ObjectVersion] Returns the object version this leaf
        #   node represents.
        def version
          if @member.kind_of?(ObjectVersion)
            @member
          else
            raise "This leaf does not represent a version"
          end
        end

        # @return [MultipartUpload] Returns the object version this leaf
        #   node represents.
        def upload
          if @member.kind_of?(MultipartUpload)
            @member
          else
            raise "This leaf does not represent an upload"
          end
        end

        def inspect
          "<#{self.class}:#{@member.bucket.name}:#{key}>"
        end

      end
    end
  end
end
