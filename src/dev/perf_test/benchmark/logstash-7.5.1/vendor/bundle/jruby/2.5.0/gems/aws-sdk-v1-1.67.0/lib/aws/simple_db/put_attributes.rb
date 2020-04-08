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
  class SimpleDB

    # @api private
    module PutAttributes

      include ExpectConditionOption

      # Given a single hash of attribute names to values, returns a list
      # of hashes suitable for the put_attributes :attributes option.
      # @api private
      protected
      def attribute_hashes attributes, replace
        attribute_hashes = []
        attributes.each_pair do |attribute_name,values|
          [values].flatten.each do |value|
            attribute_hashes << {
              :name => attribute_name.to_s,
              :value => value.to_s,
              :replace => replace,
            } unless [:if, :unless].include?(attribute_name)
          end
        end
        attribute_hashes
      end

      # @api private
      protected
      def do_put attribute_hashes, expect_opts = {}
        return nil if attribute_hashes.empty?

        opts = {
          :domain_name => item.domain.name,
          :item_name => item.name,
          :attributes => attribute_hashes,
          :expected => expect_condition_opts(expect_opts)
        }
        opts.delete(:expected) if opts[:expected].empty?

        client.put_attributes(opts)
        nil
      end

    end

  end
end
