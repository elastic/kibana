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
  class SimpleWorkflow

    # @api private
    class Resource < Core::Resource

      # @return [Boolean] Returns true if the resource exists.
      def exists?
        !!get_resource
      rescue Errors::UnknownResourceFault
        false
      end

      # @api private
      def self.attribute name, options = {}, &block

        # the simple workflow attributes are all given as 'lowerCamelCase'
        # this converts the :snake_case name to the correct format
        unless options[:from]
          parts = []
          name.to_s.split(/_/).each_with_index do |part,n|
            parts << (n == 0 ? part : part.capitalize)
          end
          options[:from] = parts.join.to_sym
        end

        if options[:duration]
          super(name, options) do
            translates_output do |v|
              v.to_s =~ /^\d+$/ ? v.to_i : v.downcase.to_sym
            end
          end
        else
          super(name, options, &block)
        end

      end

      protected
      def get_resource attr_name = nil
        method = "describe_#{Core::Inflection.ruby_name(self.class.name)}"
        client.send(method, resource_options)
      end

      # @api private
      def self.type_attributes
        @type_attributes ||= {}
      end

      # @api private
      def self.config_attributes
        @config_attributes ||= {}
      end

      # @api private
      def self.info_attributes
        @info_attributes ||= {}
      end

      # @api private
      def self.type_attribute name, options = {}, &block
        options[:static] = true unless options.has_key?(:static)
        attr = attribute(name, options, &block)
        type_attributes[attr.name] = attr
      end

      # @api private
      def self.config_attribute name, options = {}, &block
        attr = attribute(name, options.merge(:static => true), &block)
        config_attributes[attr.name] = attr
      end

      # @api private
      def self.info_attribute name, options = {}
        attr = attribute(name, options)
        info_attributes[attr.name] = attr
      end

    end
  end
end
