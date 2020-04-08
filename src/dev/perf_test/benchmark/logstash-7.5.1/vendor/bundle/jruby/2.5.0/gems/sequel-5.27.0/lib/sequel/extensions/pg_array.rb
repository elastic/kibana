# frozen-string-literal: true
#
# The pg_array extension adds support for Sequel to handle
# PostgreSQL's array types.
#
# This extension integrates with Sequel's native postgres adapter and
# the jdbc/postgresql adapter, so that when array fields are retrieved,
# they are parsed and returned as instances of Sequel::Postgres::PGArray.
# PGArray is a DelegateClass of Array, so it mostly acts like an array, but not
# completely (is_a?(Array) is false).  If you want the actual array,
# you can call PGArray#to_a.  This is done so that Sequel does not
# treat a PGArray like an Array by default, which would cause issues.
#
# In addition to the parsers, this extension comes with literalizers
# for PGArray using the standard Sequel literalization callbacks, so
# they work with on all adapters.
#
# To turn an existing Array into a PGArray:
#
#   Sequel.pg_array(array)
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Array#pg_array:
#
#   array.pg_array
#
# You can also provide a type, though in many cases it isn't necessary:
#
#   Sequel.pg_array(array, :varchar) # or :integer, :"double precision", etc.
#   array.pg_array(:varchar) # or :integer, :"double precision", etc.
#
# So if you want to insert an array into an integer[] database column:
#
#   DB[:table].insert(column: Sequel.pg_array([1, 2, 3]))
#
# To use this extension, first load it into your Sequel::Database instance:
#
#   DB.extension :pg_array
#
# See the {schema modification guide}[rdoc-ref:doc/schema_modification.rdoc]
# for details on using postgres array columns in CREATE/ALTER TABLE statements.
#
# This extension by default includes handlers for array types for
# all scalar types that the native postgres adapter handles. It
# also makes it easy to add support for other array types.  In
# general, you just need to make sure that the scalar type is
# handled and has the appropriate converter installed. For user defined
# types, you can do this via:
#
#   DB.add_conversion_proc(scalar_type_oid){|string| }
#
# Then you can call
# Sequel::Postgres::PGArray::DatabaseMethods#register_array_type
# to automatically set up a handler for the array type.  So if you
# want to support the foo[] type (assuming the foo type is already
# supported):
#
#   DB.register_array_type('foo')
#
# While this extension can parse PostgreSQL arrays with explicit bounds, it
# currently ignores explicit bounds, so such values do not round
# trip.
#
# If you want an easy way to call PostgreSQL array functions and
# operators, look into the pg_array_ops extension.
#
# This extension requires the delegate library, and the strscan library
# sequel_pg has not been loaded.
#
# Related module: Sequel::Postgres::PGArray

require 'delegate'

module Sequel
  module Postgres
    # Represents a PostgreSQL array column value.
    class PGArray < DelegateClass(Array)
      include Sequel::SQL::AliasMethods

      module DatabaseMethods
        BLOB_RANGE = 1...-1

        # Create the local hash of database type strings to schema type symbols,
        # used for array types local to this database.
        def self.extended(db)
          db.instance_exec do
            @pg_array_schema_types ||= {}
            register_array_type('timestamp without time zone', :oid=>1115, :scalar_oid=>1114, :type_symbol=>:datetime)
            register_array_type('timestamp with time zone', :oid=>1185, :scalar_oid=>1184, :type_symbol=>:datetime_timezone, :scalar_typecast=>:datetime)

            register_array_type('text', :oid=>1009, :scalar_oid=>25, :type_symbol=>:string)
            register_array_type('integer', :oid=>1007, :scalar_oid=>23)
            register_array_type('bigint', :oid=>1016, :scalar_oid=>20, :scalar_typecast=>:integer)
            register_array_type('numeric', :oid=>1231, :scalar_oid=>1700, :type_symbol=>:decimal)
            register_array_type('double precision', :oid=>1022, :scalar_oid=>701, :type_symbol=>:float)

            register_array_type('boolean', :oid=>1000, :scalar_oid=>16)
            register_array_type('bytea', :oid=>1001, :scalar_oid=>17, :type_symbol=>:blob)
            register_array_type('date', :oid=>1182, :scalar_oid=>1082)
            register_array_type('time without time zone', :oid=>1183, :scalar_oid=>1083, :type_symbol=>:time)
            register_array_type('time with time zone', :oid=>1270, :scalar_oid=>1266, :type_symbol=>:time_timezone, :scalar_typecast=>:time)

            register_array_type('smallint', :oid=>1005, :scalar_oid=>21, :scalar_typecast=>:integer)
            register_array_type('oid', :oid=>1028, :scalar_oid=>26, :scalar_typecast=>:integer)
            register_array_type('real', :oid=>1021, :scalar_oid=>700, :scalar_typecast=>:float)
            register_array_type('character', :oid=>1014, :converter=>nil, :array_type=>:text, :scalar_typecast=>:string)
            register_array_type('character varying', :oid=>1015, :converter=>nil, :scalar_typecast=>:string, :type_symbol=>:varchar)

            register_array_type('xml', :oid=>143, :scalar_oid=>142)
            register_array_type('money', :oid=>791, :scalar_oid=>790)
            register_array_type('bit', :oid=>1561, :scalar_oid=>1560)
            register_array_type('bit varying', :oid=>1563, :scalar_oid=>1562, :type_symbol=>:varbit)
            register_array_type('uuid', :oid=>2951, :scalar_oid=>2950)

            register_array_type('xid', :oid=>1011, :scalar_oid=>28)
            register_array_type('cid', :oid=>1012, :scalar_oid=>29)

            register_array_type('name', :oid=>1003, :scalar_oid=>19)
            register_array_type('tid', :oid=>1010, :scalar_oid=>27)
            register_array_type('int2vector', :oid=>1006, :scalar_oid=>22)
            register_array_type('oidvector', :oid=>1013, :scalar_oid=>30)

            [:string_array, :integer_array, :decimal_array, :float_array, :boolean_array, :blob_array, :date_array, :time_array, :datetime_array].each do |v|
              @schema_type_classes[v] = PGArray
            end
          end
        end

        def add_named_conversion_proc(name, &block)
          ret = super
          name = name.to_s if name.is_a?(Symbol)
          from(:pg_type).where(:typname=>name).select_map([:oid, :typarray]).each do |scalar_oid, array_oid|
            register_array_type(name, :oid=>array_oid.to_i, :scalar_oid=>scalar_oid.to_i)
          end
          ret
        end

        # Handle arrays in bound variables
        def bound_variable_arg(arg, conn)
          case arg
          when PGArray
            bound_variable_array(arg.to_a)
          when Array
            bound_variable_array(arg)
          else
            super
          end
        end

        # Freeze the pg array schema types to prevent adding new ones.
        def freeze
          @pg_array_schema_types.freeze
          super
        end

        # Register a database specific array type.  Options:
        #
        # :array_type :: The type to automatically cast the array to when literalizing the array.
        #                Usually the same as db_type.
        # :converter :: A callable object (e.g. Proc), that is called with each element of the array
        #               (usually a string), and should return the appropriate typecasted object.
        # :oid :: The PostgreSQL OID for the array type.  This is used by the Sequel postgres adapter
        #         to set up automatic type conversion on retrieval from the database.
        # :scalar_oid :: Should be the PostgreSQL OID for the scalar version of this array type. If given,
        #                automatically sets the :converter option by looking for scalar conversion
        #                proc.
        # :scalar_typecast :: Should be a symbol indicating the typecast method that should be called on
        #                     each element of the array, when a plain array is passed into a database
        #                     typecast method.  For example, for an array of integers, this could be set to
        #                     :integer, so that the typecast_value_integer method is called on all of the
        #                     array elements.  Defaults to :type_symbol option.
        # :type_symbol :: The base of the schema type symbol for this type.  For example, if you provide
        #                 :integer, Sequel will recognize this type as :integer_array during schema parsing.
        #                 Defaults to the db_type argument.
        #
        # If a block is given, it is treated as the :converter option.
        def register_array_type(db_type, opts=OPTS, &block)
          oid = opts[:oid]
          soid = opts[:scalar_oid]

          if has_converter = opts.has_key?(:converter)
            raise Error, "can't provide both a block and :converter option to register_array_type" if block
            converter = opts[:converter]
          else
            has_converter = true if block
            converter = block
          end

          unless (soid || has_converter) && oid
            array_oid, scalar_oid = from(:pg_type).where(:typname=>db_type.to_s).get([:typarray, :oid])
            soid ||= scalar_oid unless has_converter
            oid ||= array_oid
          end

          db_type = db_type.to_s
          type = (opts[:type_symbol] || db_type).to_sym
          typecast_method_map = @pg_array_schema_types

          if soid
            raise Error, "can't provide both a converter and :scalar_oid option to register" if has_converter 
            converter = conversion_procs[soid]
          end

          array_type = (opts[:array_type] || db_type).to_s.dup.freeze
          creator = Creator.new(array_type, converter)
          add_conversion_proc(oid, creator)

          typecast_method_map[db_type] = :"#{type}_array"

          singleton_class.class_eval do
            meth = :"typecast_value_#{type}_array"
            scalar_typecast_method = :"typecast_value_#{opts.fetch(:scalar_typecast, type)}"
            define_method(meth){|v| typecast_value_pg_array(v, creator, scalar_typecast_method)}
            private meth
          end

          @schema_type_classes[:"#{type}_array"] = PGArray
          nil
        end

        private

        # Format arrays used in bound variables.
        def bound_variable_array(a)
          case a
          when Array
            "{#{a.map{|i| bound_variable_array(i)}.join(',')}}"
          when Sequel::SQL::Blob
            "\"#{literal(a)[BLOB_RANGE].gsub("''", "'").gsub(/("|\\)/, '\\\\\1')}\""
          when Sequel::LiteralString
            a
          when String
            "\"#{a.gsub(/("|\\)/, '\\\\\1')}\""
          else
            literal(a)
          end
        end

        # Look into both the current database's array schema types and the global
        # array schema types to get the type symbol for the given database type
        # string.
        def pg_array_schema_type(type)
          @pg_array_schema_types[type]
        end

        # Make the column type detection handle registered array types.
        def schema_column_type(db_type)
          if (db_type =~ /\A([^(]+)(?:\([^(]+\))?\[\]\z/io) && (type = pg_array_schema_type($1))
            type
          else
            super
          end
        end

        # Set the :callable_default value if the default value is recognized as an empty array.
        def schema_post_process(_)
          super.each do |a|
            h = a[1]
            if h[:default] =~ /\A(?:'\{\}'|ARRAY\[\])::([\w ]+)\[\]\z/
              type = $1.freeze
              h[:callable_default] = lambda{Sequel.pg_array([], type)}
            end
          end
        end

        # Convert ruby arrays to PostgreSQL arrays when used as default values.
        def column_definition_default_sql(sql, column)
          if (d = column[:default]) && d.is_a?(Array) && !Sequel.condition_specifier?(d)
            sql << " DEFAULT (#{literal(Sequel.pg_array(d))}::#{type_literal(column)})"
          else
            super
          end
        end

        # Given a value to typecast and the type of PGArray subclass:
        # * If given a PGArray with a matching array_type, use it directly.
        # * If given a PGArray with a different array_type, return a PGArray
        #   with the creator's type.
        # * If given an Array, create a new PGArray instance for it.  This does not
        #   typecast all members of the array in ruby for performance reasons, but
        #   it will cast the array the appropriate database type when the array is
        #   literalized.
        def typecast_value_pg_array(value, creator, scalar_typecast_method=nil)
          case value
          when PGArray
            if value.array_type != creator.type
              PGArray.new(value.to_a, creator.type)
            else
              value
            end
          when Array
            if scalar_typecast_method && respond_to?(scalar_typecast_method, true)
              value = Sequel.recursive_map(value, method(scalar_typecast_method))
            end
            PGArray.new(value, creator.type)
          else
            raise Sequel::InvalidValue, "invalid value for array type: #{value.inspect}"
          end
        end
      end

      unless Sequel::Postgres.respond_to?(:parse_pg_array)
        require 'strscan'

        # PostgreSQL array parser that handles PostgreSQL array output format.
        # Note that does not handle all forms out input that PostgreSQL will
        # accept, and it will not raise an error for all forms of invalid input.
        class Parser < StringScanner
          # Set the source for the input, and any converter callable
          # to call with objects to be created.  For nested parsers
          # the source may contain text after the end current parse,
          # which will be ignored.
          def initialize(source, converter=nil)
            super(source)
            @converter = converter 
            @stack = [[]]
            @encoding = string.encoding
            @recorded = String.new.force_encoding(@encoding)
          end

          # Take the buffer of recorded characters and add it to the array
          # of entries, and use a new buffer for recorded characters.
          def new_entry(include_empty=false)
            if !@recorded.empty? || include_empty
              entry = @recorded
              if entry == 'NULL' && !include_empty
                entry = nil
              elsif @converter
                entry = @converter.call(entry)
              end
              @stack.last.push(entry)
              @recorded = String.new.force_encoding(@encoding)
            end
          end

          # Parse the input character by character, returning an array
          # of parsed (and potentially converted) objects.
          def parse
            raise Sequel::Error, "invalid array, empty string" if eos?
            raise Sequel::Error, "invalid array, doesn't start with {" unless scan(/((\[\d+:\d+\])+=)?\{/)

            # :nocov:
            while !eos?
            # :nocov:
              char = scan(/[{}",]|[^{}",]+/)
              if char == ','
                # Comma outside quoted string indicates end of current entry
                new_entry
              elsif char == '"'
                raise Sequel::Error, "invalid array, opening quote with existing recorded data" unless @recorded.empty?
                # :nocov:
                while true
                # :nocov:
                  char = scan(/["\\]|[^"\\]+/)
                  if char == '\\'
                    @recorded << getch
                  elsif char == '"'
                    n = peek(1)
                    raise Sequel::Error, "invalid array, closing quote not followed by comma or closing brace" unless n == ',' || n == '}'
                    break
                  else
                    @recorded << char
                  end
                end
                new_entry(true)
              elsif char == '{'
                raise Sequel::Error, "invalid array, opening brace with existing recorded data" unless @recorded.empty?

                # Start of new array, add it to the stack
                new = []
                @stack.last << new
                @stack << new
              elsif char == '}'
                # End of current array, add current entry to the current array
                new_entry

                if @stack.length == 1
                  raise Sequel::Error, "array parsing finished without parsing entire string" unless eos?

                  # Top level of array, parsing should be over.
                  # Pop current array off stack and return it as result
                  return @stack.pop
                else
                  # Nested array, pop current array off stack
                  @stack.pop
                end
              else
                # Add the character to the recorded character buffer.
                @recorded << char
              end
            end

            raise Sequel::Error, "array parsing finished with array unclosed"
          end
        end
      end

      # Callable object that takes the input string and parses it using Parser.
      class Creator
        # The converter callable that is called on each member of the array
        # to convert it to the correct type.
        attr_reader :converter

        # The database type to set on the PGArray instances returned.
        attr_reader :type

        # Set the type and optional converter callable that will be used.
        def initialize(type, converter=nil)
          @type = type
          @converter = converter
        end

        if Sequel::Postgres.respond_to?(:parse_pg_array)
        # :nocov:
          # Use sequel_pg's C-based parser if it has already been defined.
          def call(string)
            PGArray.new(Sequel::Postgres.parse_pg_array(string, @converter), @type)
          end
        # :nocov:
        else
          # Parse the string using Parser with the appropriate
          # converter, and return a PGArray with the appropriate database
          # type.
          def call(string)
            PGArray.new(Parser.new(string, @converter).parse, @type)
          end
        end
      end

      # The type of this array.  May be nil if no type was given. If a type
      # is provided, the array is automatically casted to this type when
      # literalizing.  This type is the underlying type, not the array type
      # itself, so for an int4[] database type, it should be :int4 or 'int4'
      attr_accessor :array_type

      # Set the array to delegate to, and a database type.
      def initialize(array, type=nil)
        super(array)
        @array_type = type
      end

      # Append the array SQL to the given sql string. 
      # If the receiver has a type, add a cast to the
      # database array type.
      def sql_literal_append(ds, sql)
        at = array_type
        if empty? && at
          sql << "'{}'"
        else
          sql << "ARRAY"
          _literal_append(sql, ds, to_a)
        end
        if at
          sql << '::' << at.to_s << '[]'
        end
      end

      private

      # Recursive method that handles multi-dimensional
      # arrays, surrounding each with [] and interspersing
      # entries with ,.
      def _literal_append(sql, ds, array)
        sql << '['
        comma = false
        commas = ','
        array.each do |i|
          sql << commas if comma
          if i.is_a?(Array)
            _literal_append(sql, ds, i)
          else
            ds.literal_append(sql, i)
          end
          comma = true
        end
        sql << ']'
      end
    end
  end

  module SQL::Builders
    # Return a Postgres::PGArray proxy for the given array and database array type.
    def pg_array(v, array_type=nil)
      case v
      when Postgres::PGArray
        if array_type.nil? || v.array_type == array_type
          v
        else
          Postgres::PGArray.new(v.to_a, array_type)
        end
      when Array
        Postgres::PGArray.new(v, array_type)
      else
        # May not be defined unless the pg_array_ops extension is used
        pg_array_op(v)
      end
    end
  end

  Database.register_extension(:pg_array, Postgres::PGArray::DatabaseMethods)
end

# :nocov:
if Sequel.core_extensions?
  class Array
    # Return a PGArray proxy to the receiver, using a
    # specific database type if given.  This is mostly useful
    # as a short cut for creating PGArray objects that didn't
    # come from the database.
    def pg_array(type=nil)
      Sequel::Postgres::PGArray.new(self, type)
    end
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Array do
      def pg_array(type=nil)
        Sequel::Postgres::PGArray.new(self, type)
      end
    end
  end
end
# :nocov:
