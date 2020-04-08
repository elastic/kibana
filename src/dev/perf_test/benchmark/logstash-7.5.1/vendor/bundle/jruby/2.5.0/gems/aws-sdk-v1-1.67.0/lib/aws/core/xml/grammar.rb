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
  module Core
    module XML

      # A class that simplifies building XML {Parser} rules.  This is also
      # a compatability layer between the old and new formats of the api
      # config.
      class Grammar

        def initialize rules = {}, options = {}
          @rules = rules
          @context = @rules
          @element_name = 'xml'
          @inflect_rename = options.key?(:inflect_rename) ?
            options[:inflect_rename] : true
        end

        # Parses the XML with the rules provided by the current grammar.
        # This method is meant to provide backwards compatability with
        # the old XmlGrammar class that handled rules and parsing.
        # @param [String] xml
        # @return [Data] Returns a hash-like parsed response.
        def parse xml
          Data.new(Parser.parse(xml, rules))
        end

        # @return [Hash] Returns a hash of rules defined by this grammar.
        attr_reader :rules

        # Returns a new grammar (leaving the current one un-modified) with
        # the given customizations applied.  Customizations can be given in
        # a hash-form or in a block form.
        #
        # @example Block-form customizations
        #
        #   grammar.customize do
        #     element "EnumElement" do
        #       symbol_value
        #       list
        #     end
        #   end
        #
        # @example Hash-form customizations
        #
        #   grammar.customize "EnumElement" => [:symbol_value, :list]
        #
        # @return [Grammar] Returns a grammar with the given customizations
        #   applied.
        #
        def customize customizations = nil, &block
          opts = { :inflect_rename => @inflect_rename }
          self.class.customize(customizations, @rules, opts, &block)
        end

        # Applies customizations to the current grammar, not returning
        # a new grammar.
        def customize! customizations = nil, &block
          apply_customizations(customizations) if customizations
          instance_eval(&block) if block_given?
          self
        end

        def self.customize customizations = nil, rules = {}, opts = {}, &block
          grammar = self.new(deep_copy(rules), opts)
          grammar.send(:apply_customizations, customizations) if customizations
          grammar.instance_eval(&block) if block_given?
          grammar
        end

        def self.parse xml
          self.new.parse(xml)
        end

        protected

        # Performs a deep copy of the rules hash so that it can be
        # customized without chaning the parent grammar.
        def self.deep_copy rules
          rules.inject({}) do |copy,(key,value)|
            copy[key] = value.is_a?(Hash) ? deep_copy(value) : value
            copy
          end
        end

        def apply_customizations customizations
          customizations.each do |item|
            (type, identifier, args) = parse_customization_item(item)
            case type
            when :method
              validate_config_method(identifier)
              validate_args(identifier, args)
              send(identifier, *args)
            when :element
              element(identifier) do
                apply_customizations(args)
              end
            end
          end
        end

        def parse_customization_item item
          case item
          when Symbol
            [:method, item, []]
          when Hash
            (method, arg) = item.to_a.first
            if method.kind_of?(Symbol)
              [:method, method, [arg].flatten]
            else
              [:element, method, arg]
            end
          end
        end

        def validate_config_method(method)
          allow_methods = %w(
            rename attribute_name boolean integer long float list force string
            ignore collect_values symbol_value timestamp map_entry map blob
            enum position
          )
          unless allow_methods.include?(method.to_s)
            raise "#{method} cannot be used in configuration"
          end
        end

        def validate_args(identifier, args)
          arity = method(identifier).arity
          if args.length > 0
            raise "#{identifier} does not accept an argument" if
              arity == 0
          else
            raise "#{identifier} requires an argument" unless
              arity == 0 || arity == -1
          end
        end

        def inflect value
          Inflection.ruby_name(value.to_s).to_sym
        end

        # customization methods

        def element element_name, &block

          parent_context = @context
          parent_element_name = @element_name

          @context = context_for_child(element_name)

          @element_name = element_name

          begin
            if block_given?
              block.arity == 1 ? yield(parent_element_name) : yield
            end
          ensure
            @context = parent_context
            @element_name = parent_element_name
          end

        end

        def ignore
          @context[:ignore] = true
        end

        def rename new_name
          if @inflect_rename
            @context[:rename] = inflect(new_name)
          else
            @context[:rename] = new_name
          end
        end

        def force
          @context[:force] = true
        end

        def collect_values
          @context[:list] = true
        end

        def index index_name, options = {}
          @context[:index] = options.merge(:name => index_name)
        end

        def default_value name, value
          @context[:defaults] ||= {}
          @context[:defaults][name] = value
        end

        def list child_element_name = nil, &block
          if child_element_name
            ignore
            element(child_element_name) do |parent_element_name|
              rename(parent_element_name)
              collect_values
              yield if block_given?
            end
          else
            collect_values
          end
        end

        def map_entry key_element_name, value_element_name
          @context[:map] = [key_element_name, value_element_name]
        end

        def map map_element_name, key_element_name, value_element_name
          ignore
          element(map_element_name) do |parent_element_name|
            rename(parent_element_name)
            map_entry(key_element_name, value_element_name)
          end
        end

        def wrapper method_name, options = {}, &block
          options[:for].each do |child|
            context_for_child(child)[:wrap] = method_name
          end
        end

        def construct_value &block
          raise 'remove the need for this'
        end

        def boolean_value
          @context[:type] = :boolean
        end
        alias_method :boolean, :boolean_value

        def blob_value
          @context[:type] = :blob
        end
        alias_method :blob, :blob_value

        def datetime_value
          @context[:type] = :datetime
        end
        alias_method :datetime, :datetime_value

        def time_value
          @context[:type] = :time
        end
        alias_method :timestamp, :time_value
        alias_method :time, :time_value

        def string_value
          @context[:type] = :string
        end
        alias_method :string, :string_value

        def integer_value
          @context[:type] = :integer
        end
        alias_method :integer, :integer_value
        alias_method :long, :integer_value

        def float_value
          @context[:type] = :float
        end
        alias_method :float, :float_value

        def symbol_value
          @context[:type] = :symbol
        end
        alias_method :symbol, :symbol_value

        def eql? other
          other.is_a?(Grammar) and self.rules == other.rules
        end
        alias_method :==, :eql?
        public :==

        def enum *args; end
        def position *args; end
        def http_trait *args; end
        alias_method :http_header, :http_trait
        alias_method :http_uri_label, :http_trait
        alias_method :http_payload, :http_trait
        alias_method :http_status, :http_trait


        protected
        def context_for_child child_element_name
          @context[:children] ||= {}
          @context[:children][child_element_name] ||= {}
          @context[:children][child_element_name]
        end

      end
    end
  end
end
