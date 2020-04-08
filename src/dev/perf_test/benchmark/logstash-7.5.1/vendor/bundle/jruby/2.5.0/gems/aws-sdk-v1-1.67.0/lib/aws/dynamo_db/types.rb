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

require 'bigdecimal'
require 'set'
require 'base64'

module AWS
  class DynamoDB

    # @api private
    module Types

      def value_from_response(hash, options = {})
        (type, value) = hash.to_a.first
        case type
        when "S", :s
          value
        when "SS", :ss
          Set[*value]
        when "N", :n
          cast_number(value, options)
        when "NS", :ns
          Set[*value.map {|v| cast_number(v, options) }]
        when "B", :b
          cast_binary(value)
        when "BS", :bs
          Set[*value.map{|v| cast_binary(v) }]
        end
      end

      def values_from_response_hash(hash, options = {})
        hash.inject({}) do |h, (key, value_hash)|
          h.update(key => value_from_response(value_hash))
        end
      end

      def format_attribute_value(value, context = nil)

        indicator = type_indicator(value, context)

        value =
          case
          when value == :empty_number_set then []
          when indicator == :n  then value.to_s
          when indicator == :ns then value.map(&:to_s)
          else value
          end

        { indicator => value }

      end

      protected

      def cast_number number, options = {}

        cfg = self.respond_to?(:config) ? self.config :
          (options[:config] || AWS.config)

        cfg.dynamo_db_big_decimals ?  BigDecimal.new(number.to_s) : number.to_f

      end

      def cast_binary data
        DynamoDB::Binary.new(data)
      end

      def type_indicator(value, context)
        case
        when value.kind_of?(DynamoDB::Binary) then :b
        when value.respond_to?(:to_str) then :s
        when value.kind_of?(Numeric) then :n
        when value.respond_to?(:each)
          indicator = nil
          value.each do |v|
            member_indicator = type_indicator(v, context)
            raise_error("nested collections", context) if
              member_indicator.to_s.size > 1
            raise_error("mixed types", context) if
              indicator and member_indicator != indicator
            indicator = member_indicator
          end
          indicator ||= :s
          :"#{indicator}s"
        when value == :empty_number_set
          :ns
        else
          raise_error("unsupported attribute type #{value.class}", context)
        end
      end

      def raise_error(msg, context)
        msg = "#{msg} in #{context}" if context
        raise ArgumentError, msg
      end

    end

  end
end
