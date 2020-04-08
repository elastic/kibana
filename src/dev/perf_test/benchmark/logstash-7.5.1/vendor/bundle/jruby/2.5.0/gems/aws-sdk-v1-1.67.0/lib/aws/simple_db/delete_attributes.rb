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
    module DeleteAttributes

      include ExpectConditionOption

      # @api private
      protected
      def delete_named_attributes *attribute_names
        expect_opts = attribute_names.pop if attribute_names.last.kind_of?(Hash)
        attributes = attribute_names.flatten.collect{|n| { :name => n.to_s } }
        opts = {
          :domain_name => item.domain.name,
          :item_name => item.name,
          :attributes => attributes,
          :expected => expect_condition_opts(expect_opts || {})
        }
        opts.delete(:expected) if opts[:expected].empty?
        client.delete_attributes(opts) unless attributes.empty?
      end

      # @api private
      protected
      def delete_attribute_values(attributes)
        opts = {
          :domain_name => item.domain.name,
          :item_name => item.name,
          :attributes => [],
          :expected => expect_condition_opts(attributes)
        }
        attributes.each do |name, values|
          if name != :"if" && name != :"unless"
            [values].flatten.each do |value|
              attribute_value = { :name => name.to_s }
              attribute_value[:value] = value unless value == :all
              opts[:attributes] << attribute_value
            end
          end
        end
        opts.delete(:expected) if opts[:expected].empty?
        client.delete_attributes(opts)
      end

    end

  end
end
