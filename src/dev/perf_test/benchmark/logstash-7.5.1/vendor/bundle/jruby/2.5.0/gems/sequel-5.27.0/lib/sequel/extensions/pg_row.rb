# frozen-string-literal: true
#
# The pg_row extension adds support for Sequel to handle
# PostgreSQL's row-valued/composite types.
#
# This extension integrates with Sequel's native postgres and jdbc/postgresql adapters, so
# that when composite fields are retrieved, they are parsed and returned
# as instances of Sequel::Postgres::PGRow::(HashRow|ArrayRow), or
# optionally a custom type.  HashRow and ArrayRow are DelegateClasses of
# Hash and Array, so they mostly act like a hash or array, but not
# completely (is_a?(Hash) and is_a?(Array) are false).  If you want the
# actual hash for a HashRow, call HashRow#to_hash, and if you want the
# actual array for an ArrayRow, call ArrayRow#to_a.  This is done so
# that Sequel does not treat a values like an Array or Hash by default,
# which would cause issues.
#
# In addition to the parsers, this extension comes with literalizers
# for HashRow and ArrayRow using the standard Sequel literalization callbacks, so
# they work with on all adapters.
#
# To use this extension, first load it into the Database instance:
#
#   DB.extension :pg_row
#
# If you plan to use arrays of composite types, make sure you load the
# pg_array extension first:
# 
#   DB.extension :pg_array, :pg_row
#
# You can create an anonymous row type by calling the Sequel.pg_row with
# an array:
#
#   Sequel.pg_row(array)
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Array#pg_row:
#
#   array.pg_row
#
# However, in most cases you are going to want something beyond anonymous
# row types.  This extension allows you to register row types on a per
# database basis, using Database#register_row_type:
#
#   DB.register_row_type(:foo)
#
# When you register the row type, Sequel will query the PostgreSQL
# system tables to find the related metadata, and will setup
# a custom HashRow subclass for that type.  This includes looking up
# conversion procs for each column in the type, so that when the composite
# type is returned from the database, the members of the type have
# the correct type.  Additionally, if the composite type also has an
# array form, Sequel registers an array type for the composite type,
# so that array columns of the composite type are converted correctly.
#
# You can then create values of that type by using Database#row_type:
#
#   DB.row_type(:address, ['123 Sesame St.', 'Some City', '12345'])
#
# Let's say table address has columns street, city, and zip.  This would return
# something similar to:
#
#   {:street=>'123 Sesame St.', :city=>'Some City', :zip=>'12345'}
#
# You can also use a hash:
#
#   DB.row_type(:address, street: '123 Sesame St.', city: 'Some City', zip: '12345')
#
# So if you have a person table that has an address column, here's how you
# could insert into the column:
#
#   DB[:table].insert(address: DB.row_type(:address, street: '123 Sesame St.', city: 'Some City', zip: '12345'))
#
# Note that registering row types without providing an explicit :converter option
# creates anonymous classes.  This results in ruby being unable to Marshal such
# objects.  You can work around this by assigning the anonymous class to a constant.
# To get a list of such anonymous classes, you can use the following code:
#
#   DB.conversion_procs.select{|k,v| v.is_a?(Sequel::Postgres::PGRow::Parser) && \
#     v.converter && (v.converter.name.nil? || v.converter.name == '') }.map{|k,v| v}
# 
# See the {schema modification guide}[rdoc-ref:doc/schema_modification.rdoc]
# for details on using row type columns in CREATE/ALTER TABLE statements.
#
# This extension requires both the strscan and delegate libraries.
#
# Related module: Sequel::Postgres::PGRow

require 'delegate'
require 'strscan'

module Sequel
  module Postgres
    module PGRow
      # Class for row-valued/composite types that are treated as arrays. By default,
      # this is only used for generic PostgreSQL record types, as registered
      # types use HashRow by default.
      class ArrayRow < DelegateClass(Array)
        include Sequel::SQL::AliasMethods

        class << self
          # The database type for this class.  May be nil if this class
          # done not have a specific database type.
          attr_accessor :db_type

          # Alias new to call, so that the class itself can be used
          # directly as a converter.
          alias call new
        end

        # Create a subclass associated with a specific database type.
        # This is done so that instances of this subclass are
        # automatically casted to the database type when literalizing.
        def self.subclass(db_type)
          Class.new(self) do
            @db_type = db_type
          end
        end

        # Sets the database type associated with this instance.  This is
        # used to override the class's default database type.
        attr_writer :db_type

        # Return the instance's database type, or the class's database
        # type if the instance has not overridden it.
        def db_type
          @db_type || self.class.db_type
        end

        # Append SQL fragment related to this object to the sql.
        def sql_literal_append(ds, sql)
          sql << 'ROW'
          ds.literal_append(sql, to_a)
          if db_type
            sql << '::'
            ds.quote_schema_table_append(sql, db_type)
          end
        end
      end

      # Class for row-valued/composite types that are treated as hashes.
      # Types registered via Database#register_row_type will use this
      # class by default.
      class HashRow < DelegateClass(Hash)
        include Sequel::SQL::AliasMethods

        class << self
          # The columns associated with this class.
          attr_accessor :columns

          # The database type for this class.  May be nil if this class
          # done not have a specific database type.
          attr_accessor :db_type

          # Alias new to call, so that the class itself can be used
          # directly as a converter.
          alias call new
        end

        # Create a new subclass of this class with the given database
        # type and columns.
        def self.subclass(db_type, columns)
          Class.new(self) do
            @db_type = db_type
            @columns = columns
          end
        end

        # Return the underlying hash for this delegate object.
        alias to_hash __getobj__

        # Sets the columns associated with this instance.  This is
        # used to override the class's default columns.
        attr_writer :columns 

        # Sets the database type associated with this instance.  This is
        # used to override the class's default database type.
        attr_writer :db_type

        # Return the instance's columns, or the class's columns
        # if the instance has not overridden it.
        def columns
          @columns || self.class.columns
        end

        # Return the instance's database type, or the class's columns
        # if the instance has not overridden it.
        def db_type
          @db_type || self.class.db_type
        end

        # Check that the HashRow has valid columns.  This should be used
        # before all attempts to literalize the object, since literalization
        # depends on the columns to get the column order.
        def check_columns!
          if columns.nil? || columns.empty?
            raise Error, 'cannot literalize HashRow without columns'
          end
        end

        # Append SQL fragment related to this object to the sql.
        def sql_literal_append(ds, sql)
          check_columns!
          sql << 'ROW'
          ds.literal_append(sql, values_at(*columns))
          if db_type
            sql << '::'
            ds.quote_schema_table_append(sql, db_type)
          end
        end
      end

      ROW_TYPE_CLASSES = [HashRow, ArrayRow].freeze

      # This parser-like class splits the PostgreSQL
      # row-valued/composite type output string format
      # into an array of strings.  Note this class makes
      # no attempt to handle all input formats that PostgreSQL
      # will accept, it only handles the output format that
      # PostgreSQL uses.
      class Splitter < StringScanner
        # Split the stored string into an array of strings, handling
        # the different types of quoting.
        def parse
          return @result if @result
          values = []
          skip(/\(/)
          if skip(/\)/)
            values << nil
          else
            # :nocov:
            until eos?
            # :nocov:
              if skip(/"/)
                values << scan(/(\\.|""|[^"])*/).gsub(/\\(.)|"(")/, '\1\2')
                skip(/"[,)]/)
              else
                v = scan(/[^,)]*/)
                values << (v unless v.empty?)
                skip(/[,)]/)
              end
            end
          end
          values
        end
      end

      # The Parser is responsible for taking the input string
      # from PostgreSQL, and returning an appropriate ruby
      # object that the type represents, such as an ArrayRow or
      # HashRow.
      class Parser
        # The columns for the parser, if any.  If the parser has
        # no columns, it will treat the input as an array.  If
        # it has columns, it will treat the input as a hash.
        # If present, should be an array of strings.
        attr_reader :columns

        # Converters for each member in the composite type.  If
        # not present, no conversion will be done, so values will
        # remain strings.  If present, should be an array of
        # callable objects.
        attr_reader :column_converters

        # The OIDs for each member in the composite type.  Not
        # currently used, but made available for user code.
        attr_reader :column_oids

        # A converter for the object as a whole.  Used to wrap
        # the returned array/hash in another object, such as an
        # ArrayRow or HashRow.  If present, should be callable.
        attr_reader :converter

        # The oid for the composite type itself.
        attr_reader :oid

        # A callable object used for typecasting the object. This
        # is similar to the converter, but it is called by the
        # typecasting code, which has different assumptions than
        # the converter.  For instance, the converter should be
        # called with all of the member values already typecast,
        # but the typecaster may not be.
        attr_reader :typecaster

        # Sets each of the parser's attributes, using options with
        # the same name (e.g. :columns sets the columns attribute).
        def initialize(h=OPTS)
          @columns = h[:columns]
          @column_converters = h[:column_converters]
          @column_oids = h[:column_oids]
          @converter = h[:converter]
          @typecaster = h[:typecaster]
          @oid = h[:oid]
        end

        # Convert the PostgreSQL composite type input format into
        # an appropriate ruby object.
        def call(s)
          convert(convert_format(convert_columns(Splitter.new(s).parse)))
        end

        # Typecast the given object to the appropriate type using the
        # typecaster.  Note that this does not conversion for the members
        # of the composite type, since those conversion expect strings and
        # strings may not be provided.  
        def typecast(obj)
          case obj 
          when Array
            _typecast(convert_format(obj))
          when Hash
            unless @columns
              raise Error, 'PGRow::Parser without columns cannot typecast from a hash'
            end
            _typecast(obj)
          else
            raise Error, 'PGRow::Parser can only typecast arrays and hashes'
          end
        end

        private

        # If the parser has a typecaster, call it with
        # the object, otherwise return the object as is.
        def _typecast(obj)
          if t = @typecaster
            t.call(obj)
          else
            obj
          end
        end

        # If the parser has column converters, map the
        # array of strings input to a array of appropriate
        # ruby objects, one for each converter.
        def convert_columns(arr)
          if ccs = @column_converters
            arr.zip(ccs).map{|v, pr| (v && pr) ? pr.call(v) : v}
          else
            arr 
          end
        end

        # If the parser has columns, return a hash assuming
        # that the array is ordered by the columns.
        def convert_format(arr)
          if cs = @columns
            h = {}
            arr.zip(cs).each{|v, c| h[c] = v}
            h
          else
            arr
          end
        end

        # If the parser has a converter, call it with the object,
        # otherwise return the object as is.
        def convert(obj)
          if c = @converter
            c.call(obj)
          else
            obj
          end
        end
      end

      module DatabaseMethods
        # A hash mapping row type keys (usually symbols), to option
        # hashes.  At the least, the values will contain the :parser
        # option for the Parser instance that the type will use.
        attr_reader :row_types

        # Do some setup for the data structures the module uses.
        def self.extended(db)
          db.instance_exec do
            @row_types = {}
            @row_schema_types = {}
            extend(@row_type_method_module = Module.new)
            add_conversion_proc(2249, PGRow::Parser.new(:converter=>PGRow::ArrayRow))
            if respond_to?(:register_array_type)
              register_array_type('record', :oid=>2287, :scalar_oid=>2249)
            end
          end
        end

        # Handle ArrayRow and HashRow values in bound variables.
        def bound_variable_arg(arg, conn)
          case arg
          when ArrayRow
            "(#{arg.map{|v| bound_variable_array(v) if v}.join(',')})"
          when HashRow
            arg.check_columns!
            "(#{arg.values_at(*arg.columns).map{|v| bound_variable_array(v) if v}.join(',')})"
          else
            super
          end
        end

        # Freeze the row types and row schema types to prevent adding new ones.
        def freeze
          @row_types.freeze
          @row_schema_types.freeze
          @row_type_method_module.freeze
          super
        end

        # Register a new row type for the Database instance. db_type should be the type
        # symbol.  This parses the PostgreSQL system tables to get information the
        # composite type, and by default has the type return instances of a subclass
        # of HashRow.
        #
        # The following options are supported:
        #
        # :converter :: Use a custom converter for the parser.
        # :typecaster :: Use a custom typecaster for the parser.
        def register_row_type(db_type, opts=OPTS)
          procs = @conversion_procs
          rel_oid = nil
          array_oid = nil
          parser_opts = {}

          # Try to handle schema-qualified types.
          type_schema, type_name = schema_and_table(db_type)
          schema_type_string = type_name.to_s

          # Get basic oid information for the composite type.
          ds = from(:pg_type).
            select{[pg_type[:oid], :typrelid, :typarray]}.
            where([[:typtype, 'c'], [:typname, type_name.to_s]])
          if type_schema
            ds = ds.join(:pg_namespace, [[:oid, :typnamespace], [:nspname, type_schema.to_s]])
            schema_type_symbol = :"pg_row_#{type_schema}__#{type_name}" 
          else
            schema_type_symbol = :"pg_row_#{type_name}"
          end
          unless row = ds.first
            raise Error, "row type #{db_type.inspect} not found in database"
          end
          # Manually cast to integer using to_i, because adapter may not cast oid type
          # correctly (e.g. swift)
          parser_opts[:oid], rel_oid, array_oid = row.values_at(:oid, :typrelid, :typarray).map(&:to_i)

          # Get column names and oids for each of the members of the composite type.
          res = from(:pg_attribute).
            join(:pg_type, :oid=>:atttypid).
            where(:attrelid=>rel_oid).
            where{attnum > 0}.
            exclude(:attisdropped).
            order(:attnum).
            select_map{[:attname, Sequel.case({0=>:atttypid}, pg_type[:typbasetype], pg_type[:typbasetype]).as(:atttypid)]}
          if res.empty?
            raise Error, "no columns for row type #{db_type.inspect} in database"
          end
          parser_opts[:columns] = res.map{|r| r[0].to_sym}
          parser_opts[:column_oids] = res.map{|r| r[1].to_i}

          # Using the conversion_procs, lookup converters for each member of the composite type
          parser_opts[:column_converters] = parser_opts[:column_oids].map do |oid|
            procs[oid]
          end

          # Setup the converter and typecaster
          parser_opts[:converter] = opts.fetch(:converter){HashRow.subclass(db_type, parser_opts[:columns])}
          parser_opts[:typecaster] = opts.fetch(:typecaster, parser_opts[:converter])

          parser = Parser.new(parser_opts)
          add_conversion_proc(parser.oid, parser)

          if respond_to?(:register_array_type) && array_oid && array_oid > 0
            array_type_name = if type_schema
              "#{type_schema}.#{type_name}"
            else
              type_name
            end
            register_array_type(array_type_name, :oid=>array_oid, :converter=>parser, :scalar_typecast=>schema_type_symbol)
          end

          @row_types[literal(db_type)] = opts.merge(:parser=>parser, :type=>db_type)
          @row_schema_types[schema_type_string] = schema_type_symbol 
          @schema_type_classes[schema_type_symbol] = ROW_TYPE_CLASSES
          @row_type_method_module.class_eval do
            meth = :"typecast_value_#{schema_type_symbol}"
            define_method(meth) do |v|
              row_type(db_type, v)
            end
            private meth
          end

          nil
        end

        # Handle typecasting of the given object to the given database type.
        # In general, the given database type should already be registered,
        # but if obj is an array, this will handled unregistered types.
        def row_type(db_type, obj)
          (type_hash = @row_types[literal(db_type)]) &&
            (parser = type_hash[:parser])

          case obj
          when ArrayRow, HashRow
            obj
          when Array
            if parser
              parser.typecast(obj)
            else
              obj = ArrayRow.new(obj)
              obj.db_type = db_type
              obj
            end
          when Hash
            if parser 
              parser.typecast(obj)
            else
              raise InvalidValue, "Database#row_type requires the #{db_type.inspect} type have a registered parser and typecaster when called with a hash"
            end
          else
            raise InvalidValue, "cannot convert #{obj.inspect} to row type #{db_type.inspect}"
          end
        end

        private

        # Format composite types used in bound variable arrays.
        def bound_variable_array(arg)
          case arg
          when ArrayRow
            "\"(#{arg.map{|v| bound_variable_array(v) if v}.join(',').gsub(/("|\\)/, '\\\\\1')})\""
          when HashRow
            arg.check_columns!
            "\"(#{arg.values_at(*arg.columns).map{|v| bound_variable_array(v) if v}.join(',').gsub(/("|\\)/, '\\\\\1')})\""
          else
            super
          end
        end

        # Make the column type detection handle registered row types.
        def schema_column_type(db_type)
          if type = @row_schema_types[db_type]
            type
          else
            super
          end
        end
      end
    end
  end

  module SQL::Builders
    # Wraps the expr array in an anonymous Postgres::PGRow::ArrayRow instance.
    def pg_row(expr)
      case expr
      when Array
        Postgres::PGRow::ArrayRow.new(expr)
      else
        # Will only work if pg_row_ops extension is loaded
        pg_row_op(expr)
      end
    end
  end

  Database.register_extension(:pg_row, Postgres::PGRow::DatabaseMethods)
end

# :nocov:
if Sequel.core_extensions?
  class Array
    # Wraps the receiver in an anonymous Sequel::Postgres::PGRow::ArrayRow instance.
    def pg_row
      Sequel::Postgres::PGRow::ArrayRow.new(self)
    end
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Array do
      def pg_row
        Sequel::Postgres::PGRow::ArrayRow.new(self)
      end
    end
  end
end
# :nocov:
