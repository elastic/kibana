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

require 'rexml/text'

module AWS
  class S3

    # Common methods for AccessControlList and related objects.
    module ACLObject

      # @api private
      def initialize(opts = {}); end

      # @api private
      def body_xml; ""; end

      # @api private
      def stag
        element_name
      end

      # @api private
      def element_name
        self.class.name[/::([^:]*)$/, 1]
      end

      # Returns the XML representation of the object.  Generally
      # you'll want to call this on an AccessControlList object,
      # which will yield an XML representation of the ACL that you
      # can send to S3.
      def to_s
        if body_xml.empty?
          "<#{stag}/>"
        else
          "<#{stag}>#{body_xml}</#{element_name}>"
        end
      end

      # (see #to_s)
      def to_xml
        to_s
      end

      # Returns true if and only if this object is valid according
      # to S3's published ACL schema.  In particular, this will
      # check that all required attributes are provided and that
      # they are of the correct type.
      def valid?
        validate!
      rescue => e
        false
      else
        true
      end

      # Raises an exception unless this object is valid according to
      # S3's published ACL schema.
      # @see #valid?
      def validate!; end

      # @api private
      def validate_input(name, value, context = nil)
        send("validate_#{name}_input!", value, context)
      end

      # @api private
      module ClassMethods

        def string_attr(element_name, options = {})
          method_name = options[:method_name] ||
            Core::Inflection.ruby_name(element_name)

          attr_accessor(method_name)
          setter_option(method_name)
          string_input_validator(method_name)
          validate_string(method_name) if options[:required]
          body_xml_string_content(element_name, method_name)
        end

        def object_attr(klass, options = {})
          base_name = klass.name[/::([^:]*)$/, 1]
          method_name = Core::Inflection.ruby_name(base_name)
          cast = options[:cast] || Hash

          attr_reader(method_name)
          setter_option(method_name)
          object_setter(klass, method_name, cast)
          object_input_validator(klass, base_name, method_name, cast)
          validate_object(method_name) if options[:required]
          body_xml_content(method_name)
        end

        def object_list_attr(list_element, klass, options = {})
          base_name = klass.name[/::([^:]*)$/, 1]
          method_name = Core::Inflection.ruby_name(options[:method_name].to_s || list_element)
          default_value = nil
          default_value = [] if options[:required]

          attr_reader(method_name)
          setter_option(method_name) { [] if options[:required] }
          object_list_setter(klass, method_name)
          object_list_input_validator(klass, base_name, method_name)
          validate_list(method_name)
          body_xml_list_content(list_element, method_name)
        end

        def setter_option(method_name)
          Core::MetaUtils.class_extend_method(self, :initialize) do |*args|
            opts = args.last || {}
            instance_variable_set("@#{method_name}", yield) if block_given?
            key = method_name.to_sym

            if opts.has_key?(key)
              value = opts[key]
              validate_input(method_name, value, "for #{method_name} option")
              self.send("#{method_name}=", value)
            end
            super(opts)
          end
        end

        def string_input_validator(method_name)
          input_validator(method_name) do |value, context|
            raise ArgumentError.new("expected string"+context) unless
              value.respond_to?(:to_str)
          end
        end

        def object_input_validator(klass, base_name, method_name, cast)
          input_validator(method_name) do |value, context|
            if value.kind_of?(cast)
              klass.new(value).validate!
            else
              raise ArgumentError.new("expected #{base_name} object or hash"+context) unless
                value.nil? or value.kind_of? klass
            end
          end
        end

        def object_list_input_validator(klass, base_name, method_name)
          input_validator(method_name) do |value, context|
            raise ArgumentError.new("expected array"+context) unless value.kind_of?(Array)
            value.each do |member|
              if member.kind_of?(Hash)
                klass.new(member).validate!
              else
                raise ArgumentError.new("expected array#{context} "+
                                        "to contain #{base_name} objects "+
                                        "or hashes") unless
                  member.kind_of? klass
              end
            end
          end
        end

        def input_validator(method_name, &blk)
          validator = "__validator__#{blk.object_id}"
          Core::MetaUtils.class_extend_method(self, validator, &blk)
          Core::MetaUtils.class_extend_method(self, "validate_#{method_name}_input!") do |*args|
            (value, context) = args
            context = " "+context if context
            context ||= ""
            send(validator, value, context)
          end
        end

        def object_setter(klass, method_name, cast)
          define_method("#{method_name}=") do |value|
            validate_input(method_name, value)
            if value.kind_of?(cast)
              value = klass.new(value)
            end
            instance_variable_set("@#{method_name}", value)
          end
        end

        def object_list_setter(klass, method_name)
          define_method("#{method_name}=") do |value|
            validate_input(method_name, value)
            list = value.map do |member|
              if member.kind_of?(Hash)
                klass.new(member)
              else
                member
              end
            end
            instance_variable_set("@#{method_name}", list)
          end
        end

        def validate_string(method_name)
          Core::MetaUtils.class_extend_method(self, :validate!) do
            super()
            raise "missing #{method_name}" unless send(method_name)
          end
        end

        def validate_object(method_name)
          Core::MetaUtils.class_extend_method(self, :validate!) do
            super()
            raise "missing #{method_name}" unless send(method_name)
            send(method_name).validate!
          end
        end

        def validate_list(method_name)
          Core::MetaUtils.class_extend_method(self, :validate!) do
            super()
            raise "missing #{method_name}" unless send(method_name)
            send(method_name).each { |member| member.validate! }
          end
        end

        def body_xml_string_content(element_name, method_name)
          add_xml_child(method_name) do |value|
            normalized = REXML::Text.normalize(value.to_s)
            "<#{element_name}>#{normalized}</#{element_name}>"
          end
        end

        def body_xml_content(method_name)
          add_xml_child(method_name) { |value| value.to_s }
        end

        def body_xml_list_content(list_element, method_name)
          add_xml_child(method_name) do |list|
            list_content = list.map { |member| member.to_s }.join
            if list_content.empty?
              "<#{list_element}/>"
            else
              "<#{list_element}>#{list_content}</#{list_element}>"
            end
          end
        end

        def add_xml_child(method_name)
          Core::MetaUtils.class_extend_method(self, :body_xml) do
            xml = super()
            value = send(method_name)
            xml += yield(value) if value
            xml
          end
        end

      end

      def self.included(m)
        m.extend(ClassMethods)
      end

    end
  end
end
