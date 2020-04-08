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

require 'nokogiri'

module AWS
  module Core
    module Options

      # Given a hash of serialization rules, an XMLSerializer can convert
      # a hash of request options into XML.  The request options are
      # validated before returning XML.
      class XMLSerializer

        # @param [String] namespace
        # @param [String] operation_name
        # @param [Hash] operation
        def initialize namespace, operation_name, operation
          @namespace = namespace
          @operation_name = operation_name
          @rules = operation[:inputs]
          @http = operation[:http]
          @validator = Validator.new(rules)
        end

        # @return [String] Returns the name of the API operation.
        attr_reader :operation_name

        # @return [String]
        attr_reader :namespace

        # @return [Hash]
        attr_reader :rules

        # @return [Hash,nil]
        attr_reader :http

        # @return [Validator]
        attr_reader :validator

        # @overload serialize!(request_options)
        #   @param [Hash] request_options A hash of already validated
        #     request options with normalized values.
        #   @return [String] Returns an string of the request parameters
        #     serialized into XML.
        def serialize request_options
          if http && http[:request_payload]
            payload = http[:request_payload]
            root_node_name = rules[payload][:name]
            params = request_options[payload]
            rules = self.rules[payload][:members]
          else
            root_node_name = "#{operation_name}Request"
            params = request_options
            rules = self.rules
          end
          xml = Nokogiri::XML::Builder.new
          xml.send(root_node_name, :xmlns => namespace) do |xml|
            hash_members_xml(params, rules, xml)
          end
          xml.doc.root.to_xml
        end

        protected

        def to_xml builder, opt_name, rules, value

          xml_name = rules[:name]
          xml_name ||= opt_name.is_a?(String) ?
            opt_name : Inflection.class_name(opt_name.to_s)

          case value
          when Hash

            builder.send(xml_name) do |builder|
              hash_members_xml(value, rules[:members], builder)
            end

          when Array
            builder.send(xml_name) do
              value.each do |member_value|
                to_xml(builder, 'member', rules[:members], member_value)
              end
            end
          else builder.send(xml_name, value)
          end

        end

        def hash_members_xml hash, rules, builder
          xml_ordered_members(rules).each do |member_name|
            if hash.key?(member_name)
              value = hash[member_name]
              to_xml(builder, member_name, rules[member_name], value)
            end
          end
        end

        def xml_ordered_members members
          members.inject([]) do |list,(member_name, member)|
            list << [member[:position] || 0, member_name]
          end.sort_by(&:first).map(&:last)
        end

      end
    end
  end
end
