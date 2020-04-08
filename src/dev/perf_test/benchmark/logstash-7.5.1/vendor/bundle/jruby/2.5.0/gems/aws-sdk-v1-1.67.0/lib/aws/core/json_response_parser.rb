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

require 'json'
require 'time'
require 'bigdecimal'
require 'base64'

module AWS
  module Core

    # @api private
    class JSONResponseParser

      def initialize rules
        @rules = rules
      end

      def extract_data response
        body = response.http_response.body
        body = "{}" if [nil, ''].include?(body)
        translate(JSON.load(body))
      end

      def simulate
        {}
      end

      protected

      # @param [Hash] values
      # @param [Hash] rules
      # @return [Hash]
      def translate values, rules = @rules
        rules.inject({}) do |data,(key,rule)|
          if values.key?(key)
            data.merge(rule[:sym] || key => translate_value(values[key], rule))
          else
            data
          end
        end
      end

      def translate_hash values, rules
        translate(values, rules[:members])
      end

      def translate_map values, rules
        values.inject({}) do |data,(key,value)|
          data.merge(key => translate_value(value, rules[:members]))
        end
      end

      def translate_value value, rule
        case
        when value.is_a?(Array) then value.map{|v| translate_value(v, rule) }
        when rule[:type] == :hash then translate_hash(value, rule)
        when rule[:type] == :map then translate_map(value, rule)
        when rule[:type] == :blob then Base64.decode64(value)
        when rule[:type] == :time then Time.at(value)
        when rule[:type] == :big_decimal then BigDecimal.new(value)
        else value
        end
      end

    end

  end
end
