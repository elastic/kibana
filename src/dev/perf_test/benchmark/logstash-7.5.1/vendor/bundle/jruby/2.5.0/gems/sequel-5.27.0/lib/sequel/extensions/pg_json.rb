# frozen-string-literal: true
#
# The pg_json extension adds support for Sequel to handle
# PostgreSQL's json and jsonb types.  By default, it wraps
# JSON arrays and JSON objects with ruby array-like and
# hash-like objects.  If you would like to wrap JSON primitives
# (numbers, strings, +null+, +true+, and +false+), you need to
# use the +wrap_json_primitives+ setter:
#
#   DB.extension :pg_json
#   DB.wrap_json_primitives = true
#
# Note that wrapping JSON primitives changes the behavior for
# JSON false and null values.  Because only +false+ and +nil+
# in Ruby are considered falsey, wrapping these objects results
# in unexpected behavior if you use the values directly in
# conditionals:
#
#   if DB[:table].get(:json_column)
#     # called if the value of json_column is null/false
#     # if you are wrapping primitives
#   end
#
# To extract the Ruby primitive object from the wrapper object,
# you can use +__getobj__+ (this comes from Ruby's delegate library).
#
# To wrap an existing Ruby array, hash, string, integer, float,
# +nil+, +true+, or +false+, use +Sequel.pg_json_wrap+ or +Sequel.pg_jsonb_wrap+:
#
#   Sequel.pg_json_wrap(object)  # json type
#   Sequel.pg_jsonb_wrap(object) # jsonb type
#
# So if you want to insert an array or hash into an json database column:
#
#   DB[:table].insert(column: Sequel.pg_json_wrap([1, 2, 3]))
#   DB[:table].insert(column: Sequel.pg_json_wrap({'a'=>1, 'b'=>2}))
#
# Note that the +pg_json_wrap+ and +pg_jsonb_wrap+ methods only handle Ruby primitives,
# they do not handle already wrapped objects.
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use the
# +pg_json+ and +pg_jsonb+ methods directly on Array or Hash:
#
#   array.pg_json  # json type
#   array.pg_jsonb # jsonb type
#
#   hash.pg_json   # json type
#   hash.pg_jsonb  # jsonb type
#
# Model classes that use json or jsonb columns will have typecasting automatically
# setup, so you can assign Ruby primitives to model columns and have the wrapped
# objects automatically created.  However, for backwards compatibility, passing
# a string object will parse the string as JSON, not create a JSON string object.
# 
#   obj = Model.new
#   obj.json_column = {'a'=>'b'}
#   obj.json_column.class
#   # => Sequel::Postgres::JSONHash
#   obj.json_column['a']
#   # => 'b'
#
#   obj.json_column = '{"a": "b"}'
#   obj.json_column.class
#   # => Sequel::Postgres::JSONHash
#   obj.json_column['a']
#   # => 'b'
#
# You can change the handling of string typecasting by using +typecast_json_strings+:
#
#   DB.typecast_json_strings = true
#   obj.json_column = '{"a": "b"}'
#   obj.json_column.class
#   # => Sequel::Postgres::JSONString
#   obj.json_column
#   # => '{"a": "b"}'
#
# Note that +nil+ values are never automatically wrapped:
#
#   obj.json_column = nil
#   obj.json_column.class
#   # => NilClass
#   obj.json_column
#   # => nil
#
# If you want to set a JSON null value when using a model, you must wrap it
# explicitly:
#
#   obj.json_column = Sequel.pg_json_wrap(nil)
#   obj.json_column.class
#   # => Sequel::Postgres::JSONNull
#   obj.json_column
#   # => nil
#
# To use this extension, load it into the Database instance:
#
#   DB.extension :pg_json
#
# See the {schema modification guide}[rdoc-ref:doc/schema_modification.rdoc]
# for details on using json columns in CREATE/ALTER TABLE statements.
#
# This extension integrates with the pg_array extension.  If you plan
# to use the json[] or jsonb[] types, load the pg_array extension before the
# pg_json extension:
#
#   DB.extension :pg_array, :pg_json
#
# Note that when accessing json hashes, you should always use strings for keys.
# Attempting to use other values (such as symbols) will not work correctly.
#
# This extension requires both the json and delegate libraries.  However, you
# can override +Sequel.parse_json+, +Sequel.object_to_json+, and
# +Sequel.json_parser_error_class+ to use an alternative JSON implementation.
#
# Related modules: Sequel::Postgres::JSONDatabaseMethods

require 'delegate'
require 'json'

module Sequel
  module Postgres
    # A module included in all of the JSON wrapper classes.
    module JSONObject
    end

    # A module included in all of the JSONB wrapper classes.
    module JSONBObject
    end

    create_delegate_class = lambda do |name, delegate_class|
      base_class = DelegateClass(delegate_class)
      base_class.class_eval do
        include Sequel::SQL::AliasMethods
        include Sequel::SQL::CastMethods
      end

      json_class = Class.new(base_class) do
        include JSONObject

        def sql_literal_append(ds, sql)
          ds.literal_append(sql, Sequel.object_to_json(self))
          sql << '::json'
        end
      end

      jsonb_class = Class.new(base_class) do
        include JSONBObject

        def sql_literal_append(ds, sql)
          ds.literal_append(sql, Sequel.object_to_json(self))
          sql << '::jsonb'
        end
      end

      const_set(:"JSON#{name}Base", base_class)
      const_set(:"JSON#{name}", json_class)
      const_set(:"JSONB#{name}", jsonb_class)
    end

    create_delegate_class.call(:Array, Array)
    create_delegate_class.call(:Hash, Hash)
    create_delegate_class.call(:String, String)
    create_delegate_class.call(:Integer, Integer)
    create_delegate_class.call(:Float, Float)
    create_delegate_class.call(:Null, NilClass)
    create_delegate_class.call(:True, TrueClass)
    create_delegate_class.call(:False, FalseClass)

    JSON_WRAPPER_MAPPING = {
      ::Array => JSONArray,
      ::Hash => JSONHash,
    }.freeze

    JSONB_WRAPPER_MAPPING = {
      ::Array => JSONBArray,
      ::Hash => JSONBHash,
    }.freeze

    JSON_PRIMITIVE_WRAPPER_MAPPING = {
      ::String => JSONString,
      ::Integer => JSONInteger,
      ::Float => JSONFloat,
      ::NilClass => JSONNull,
      ::TrueClass => JSONTrue,
      ::FalseClass => JSONFalse,
    }

    JSONB_PRIMITIVE_WRAPPER_MAPPING = {
      ::String => JSONBString,
      ::Integer => JSONBInteger,
      ::Float => JSONBFloat,
      ::NilClass => JSONBNull,
      ::TrueClass => JSONBTrue,
      ::FalseClass => JSONBFalse,
    }

    if RUBY_VERSION < '2.4'
      # :nocov:
      JSON_PRIMITIVE_WRAPPER_MAPPING[Fixnum] = JSONInteger
      JSON_PRIMITIVE_WRAPPER_MAPPING[Bignum] = JSONInteger
      JSONB_PRIMITIVE_WRAPPER_MAPPING[Fixnum] = JSONBInteger
      JSONB_PRIMITIVE_WRAPPER_MAPPING[Bignum] = JSONBInteger
      # :nocov:
    end

    JSON_PRIMITIVE_WRAPPER_MAPPING.freeze
    JSONB_PRIMITIVE_WRAPPER_MAPPING.freeze

    JSON_COMBINED_WRAPPER_MAPPING =JSON_WRAPPER_MAPPING.merge(JSON_PRIMITIVE_WRAPPER_MAPPING).freeze
    JSONB_COMBINED_WRAPPER_MAPPING =JSONB_WRAPPER_MAPPING.merge(JSONB_PRIMITIVE_WRAPPER_MAPPING).freeze
    JSONB_WRAP_CLASSES = JSONB_COMBINED_WRAPPER_MAPPING.keys.freeze

    Sequel::Deprecation.deprecate_constant(self, :JSON_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSONB_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSON_PRIMITIVE_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSONB_PRIMITIVE_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSON_COMBINED_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSONB_COMBINED_WRAPPER_MAPPING)
    Sequel::Deprecation.deprecate_constant(self, :JSONB_WRAP_CLASSES)

    JSON_WRAP_CLASSES = [Hash, Array, String, Integer, Float, NilClass, TrueClass, FalseClass].freeze

    # Methods enabling Database object integration with the json type.
    module JSONDatabaseMethods
      def self.extended(db)
        db.instance_exec do
          add_conversion_proc(114, method(:_db_parse_json))
          add_conversion_proc(3802, method(:_db_parse_jsonb))
          if respond_to?(:register_array_type)
            register_array_type('json', :oid=>199, :scalar_oid=>114)
            register_array_type('jsonb', :oid=>3807, :scalar_oid=>3802)
          end
          @schema_type_classes[:json] = [JSONObject]
          @schema_type_classes[:jsonb] = [JSONBObject]
        end
      end

      # Return the wrapper class for the json type if value is Hash or Array.
      def self.json_wrapper(value)
        case value
        when ::Hash
          JSONHash
        when ::Array
          JSONArray
        end
      end

      # Return the wrapper class for the jsonb type if value is Hash or Array.
      def self.jsonb_wrapper(value)
        case value
        when ::Hash
          JSONBHash
        when ::Array
          JSONBArray
        end
      end

      # Return the wrapper class for the json type if value is a supported type.
      def self.json_primitive_wrapper(value)
        case value
        when ::Hash
          JSONHash
        when ::Array
          JSONArray
        when ::String
          JSONString
        when ::Integer
          JSONInteger
        when ::Float
          JSONFloat
        when ::NilClass
          JSONNull
        when ::TrueClass
          JSONTrue
        when ::FalseClass
          JSONFalse
        end
      end

      # Return the wrapper class for the jsonb type if value is a supported type.
      def self.jsonb_primitive_wrapper(value)
        case value
        when ::Hash
          JSONBHash
        when ::Array
          JSONBArray
        when ::String
          JSONBString
        when ::Integer
          JSONBInteger
        when ::Float
          JSONBFloat
        when ::NilClass
          JSONBNull
        when ::TrueClass
          JSONBTrue
        when ::FalseClass
          JSONBFalse
        end
      end

      # Deprecated
      def self.db_parse_json(s)
        # SEQUEL6: Remove
        parse_json(s)
      rescue Sequel::InvalidValue
        raise unless s.is_a?(String)
        parse_json("[#{s}]").first
      end

      # Deprecated
      def self.db_parse_jsonb(s)
        # SEQUEL6: Remove
        parse_json(s, true)
      rescue Sequel::InvalidValue
        raise unless s.is_a?(String)
        parse_json("[#{s}]").first
      end

      # Deprecated
      def self.parse_json(s, jsonb=false)
        # SEQUEL6: Remove
        Sequel::Deprecation.deprecate("Sequel::Postgres::JSONDatabaseMethods.{parse_json,db_parse_json,db_parse_jsonb} are deprecated and will be removed in Sequel 6.")
        begin
          value = Sequel.parse_json(s)
        rescue Sequel.json_parser_error_class => e
          raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
        end

        case value
        when Array
          (jsonb ? JSONBArray : JSONArray).new(value)
        when Hash 
          (jsonb ? JSONBHash : JSONHash).new(value)
        when String, Numeric, true, false, nil
          value
        else
          raise Sequel::InvalidValue, "unhandled json value: #{value.inspect} (from #{s.inspect})"
        end
      end

      # Whether to wrap JSON primitives instead of using Ruby objects.
      # Wrapping the primitives allows the primitive values to roundtrip,
      # but it can cause problems, especially as false/null JSON values
      # will be treated as truthy in Ruby due to the wrapping.  False by
      # default.
      attr_accessor :wrap_json_primitives

      # Whether to typecast strings for json/jsonb types as JSON
      # strings, instead of trying to parse the string as JSON.
      # False by default.
      attr_accessor :typecast_json_strings

      # Handle json and jsonb types in bound variables
      def bound_variable_arg(arg, conn)
        case arg
        when JSONObject, JSONBObject
          Sequel.object_to_json(arg)
        else
          super
        end
      end

      private

      # Parse JSON data coming from the database.  Since PostgreSQL allows
      # non JSON data in JSON fields (such as plain numbers and strings),
      # we don't want to raise an exception for that.
      def _db_parse_json(s)
        _wrap_json(_parse_json(s))
      rescue Sequel::InvalidValue
        raise unless s.is_a?(String)
        _wrap_json(_parse_json("[#{s}]").first)
      end

      # Same as _db_parse_json, but consider the input as jsonb.
      def _db_parse_jsonb(s)
        _wrap_jsonb(_parse_json(s))
      rescue Sequel::InvalidValue
        raise unless s.is_a?(String)
        _wrap_jsonb(_parse_json("[#{s}]").first)
      end

      # Parse the given string as json, returning either a JSONArray
      # or JSONHash instance (or JSONBArray or JSONBHash instance if jsonb
      # argument is true), or a String, Numeric, true, false, or nil
      # if the json library used supports that.
      def _parse_json(s)
        begin
          Sequel.parse_json(s)
        rescue Sequel.json_parser_error_class => e
          raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
        end
      end

      # Wrap the parsed JSON value in the appropriate JSON wrapper class.
      # Only wrap primitive values if wrap_json_primitives is set.
      def _wrap_json(value)
        if klass = JSONDatabaseMethods.json_wrapper(value)
          klass.new(value)
        elsif klass = JSONDatabaseMethods.json_primitive_wrapper(value)
          if wrap_json_primitives
            klass.new(value)
          else
            value
          end
        else
          raise Sequel::InvalidValue, "unhandled json value: #{value.inspect}"
        end
      end

      # Wrap the parsed JSON value in the appropriate JSONB wrapper class.
      # Only wrap primitive values if wrap_json_primitives is set.
      def _wrap_jsonb(value)
        if klass = JSONDatabaseMethods.jsonb_wrapper(value)
          klass.new(value)
        elsif klass = JSONDatabaseMethods.jsonb_primitive_wrapper(value)
          if wrap_json_primitives
            klass.new(value)
          else
            value
          end
        else
          raise Sequel::InvalidValue, "unhandled jsonb value: #{value.inspect}"
        end
      end

      # Handle json[] and jsonb[] types in bound variables.
      def bound_variable_array(a)
        case a
        when JSONObject, JSONBObject
          "\"#{Sequel.object_to_json(a).gsub('"', '\\"')}\""
        else
          super
        end
      end

      # Make the column type detection recognize the json types.
      def schema_column_type(db_type)
        case db_type
        when 'json'
          :json
        when 'jsonb'
          :jsonb
        else
          super
        end
      end

      # Set the :callable_default value if the default value is recognized as an empty json/jsonb array/hash.
      def schema_post_process(_)
        super.each do |a|
          h = a[1]
          if (h[:type] == :json || h[:type] == :jsonb) && h[:default] =~ /\A'(\{\}|\[\])'::jsonb?\z/
            is_array = $1 == '[]'

            klass = if h[:type] == :json
              if is_array
                JSONArray
              else
                JSONHash
              end
            elsif is_array
              JSONBArray
            else
              JSONBHash
            end

            h[:callable_default] = lambda{klass.new(is_array ? [] : {})}
          end
        end
      end

      # Convert the value given to a JSON wrapper object.
      def typecast_value_json(value)
        case value
        when JSONObject
          value
        when String
          if typecast_json_strings
            JSONString.new(value)
          else
            _wrap_json(_parse_json(value))
          end
        when *JSON_WRAP_CLASSES
          JSONDatabaseMethods.json_primitive_wrapper(value).new(value)
        when JSONBObject
          value = value.__getobj__
          JSONDatabaseMethods.json_primitive_wrapper(value).new(value)
        else
          raise Sequel::InvalidValue, "invalid value for json: #{value.inspect}"
        end
      end

      # Convert the value given to a JSONB wrapper object.
      def typecast_value_jsonb(value)
        case value
        when JSONBObject
          value
        when String
          if typecast_json_strings
            JSONBString.new(value)
          else
            _wrap_jsonb(_parse_json(value))
          end
        when *JSON_WRAP_CLASSES
          JSONDatabaseMethods.jsonb_primitive_wrapper(value).new(value)
        when JSONObject
          value = value.__getobj__
          JSONDatabaseMethods.jsonb_primitive_wrapper(value).new(value)
        else
          raise Sequel::InvalidValue, "invalid value for jsonb: #{value.inspect}"
        end
      end
    end
  end

  module SQL::Builders
    # Wrap the array or hash in a Postgres::JSONArray or Postgres::JSONHash.
    # Also handles Postgres::JSONObject and JSONBObjects.
    # For other objects, calls +Sequel.pg_json_op+ (which is defined
    # by the pg_json_ops extension).
    def pg_json(v)
      case v
      when Postgres::JSONObject
        v
      when Array
        Postgres::JSONArray.new(v)
      when Hash
        Postgres::JSONHash.new(v)
      when Postgres::JSONBObject
        v = v.__getobj__
        Postgres::JSONDatabaseMethods.json_primitive_wrapper(v).new(v)
      else
        Sequel.pg_json_op(v)
      end
    end

    # Wraps Ruby array, hash, string, integer, float, true, false, and nil
    # values with the appropriate JSON wrapper.  Raises an exception for
    # other types.
    def pg_json_wrap(v)
      case v
      when *Postgres::JSON_WRAP_CLASSES
        Postgres::JSONDatabaseMethods.json_primitive_wrapper(v).new(v)
      else
        raise Error, "invalid value passed to Sequel.pg_json_wrap: #{v.inspect}"
      end
    end

    # Wrap the array or hash in a Postgres::JSONBArray or Postgres::JSONBHash.
    # Also handles Postgres::JSONObject and JSONBObjects.
    # For other objects, calls +Sequel.pg_json_op+ (which is defined
    # by the pg_json_ops extension).
    def pg_jsonb(v)
      case v
      when Postgres::JSONBObject
        v
      when Array
        Postgres::JSONBArray.new(v)
      when Hash
        Postgres::JSONBHash.new(v)
      when Postgres::JSONObject
        v = v.__getobj__
        Postgres::JSONDatabaseMethods.jsonb_primitive_wrapper(v).new(v)
      else
        Sequel.pg_jsonb_op(v)
      end
    end

    # Wraps Ruby array, hash, string, integer, float, true, false, and nil
    # values with the appropriate JSONB wrapper.  Raises an exception for
    # other types.
    def pg_jsonb_wrap(v)
      case v
      when *Postgres::JSON_WRAP_CLASSES
        Postgres::JSONDatabaseMethods.jsonb_primitive_wrapper(v).new(v)
      else
        raise Error, "invalid value passed to Sequel.pg_jsonb_wrap: #{v.inspect}"
      end
    end
  end

  Database.register_extension(:pg_json, Postgres::JSONDatabaseMethods)
end

# :nocov:
if Sequel.core_extensions?
  class Array
    # Return a Sequel::Postgres::JSONArray proxy to the receiver.
    # This is mostly useful as a short cut for creating JSONArray
    # objects that didn't come from the database.
    def pg_json
      Sequel::Postgres::JSONArray.new(self)
    end

    # Return a Sequel::Postgres::JSONArray proxy to the receiver.
    # This is mostly useful as a short cut for creating JSONArray
    # objects that didn't come from the database.
    def pg_jsonb
      Sequel::Postgres::JSONBArray.new(self)
    end
  end

  class Hash
    # Return a Sequel::Postgres::JSONHash proxy to the receiver.
    # This is mostly useful as a short cut for creating JSONHash
    # objects that didn't come from the database.
    def pg_json
      Sequel::Postgres::JSONHash.new(self)
    end

    # Return a Sequel::Postgres::JSONHash proxy to the receiver.
    # This is mostly useful as a short cut for creating JSONHash
    # objects that didn't come from the database.
    def pg_jsonb
      Sequel::Postgres::JSONBHash.new(self)
    end
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Array do
      def pg_json
        Sequel::Postgres::JSONArray.new(self)
      end

      def pg_jsonb
        Sequel::Postgres::JSONBArray.new(self)
      end
    end

    refine Hash do
      def pg_json
        Sequel::Postgres::JSONHash.new(self)
      end

      def pg_jsonb
        Sequel::Postgres::JSONBHash.new(self)
      end
    end
  end
end
# :nocov:
