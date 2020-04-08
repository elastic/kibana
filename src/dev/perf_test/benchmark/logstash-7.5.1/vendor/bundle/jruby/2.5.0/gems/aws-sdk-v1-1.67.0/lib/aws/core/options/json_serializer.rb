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
require 'base64'

module AWS
  module Core
    module Options

      # Given a hash of serialization rules, a JSONSerializer can convert
      # a hash of request options into a JSON document.  The request options
      # are validated before returning JSON.
      class JSONSerializer

        # @param [Hash] rules A hash of option rules to validate against.
        # @param [String,nil] payload_param
        def initialize rules, payload_param
          @payload_param = payload_param
          @rules = @payload_param ? rules[@payload_param][:members] : rules
        end

        # @return [String] Returns the name of the API operation.
        attr_reader :operation_name

        # @return [String]
        attr_reader :namespace

        # @return [Hash]
        attr_reader :rules

        # @overload serialize!(request_options)
        #   @param [Hash] request_options A hash of already validated
        #     request options with normalized values.
        #   @return [String] Returns an string of the request parameters
        #     serialized into XML.
        def serialize request_options
          request_options = request_options[@payload_param] if @payload_param
          data = normalize_keys(request_options, rules)
          if rules.any?{|k,v| v[:location] == 'body' }
            data = data.values.first
          end
          JSON.pretty_generate(data)
        end

        protected

        def normalize_keys values, rules
          values.inject({}) do |h,(k,v)|
            child_rules = rules[k]
            child_name = child_rules[:name] || Inflection.class_name(k.to_s)
            h.merge(child_name => normalize_value(v, child_rules))
          end
        end

        def normalize_value value, rules
          case rules[:type]
          when :hash then normalize_keys(value, rules[:members])
          when :array then value.map{|v| normalize_value(v, rules[:members]) }
          when :map
            value.inject({}) do |h,(k,v)|
              h.merge(k => normalize_value(v, rules[:members]))
            end
          when :blob then Base64.encode64(value.read).strip
          else value
          end
        end

      end
    end
  end
end
