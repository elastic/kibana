# frozen-string-literal: true
#
# The pg_hstore extension adds support for the PostgreSQL hstore type
# to Sequel.  hstore is an extension that ships with PostgreSQL, and
# the hstore type stores an arbitrary key-value table, where the keys
# are strings and the values are strings or NULL.
#
# This extension integrates with Sequel's native postgres and jdbc/postgresql
# adapters, so that when hstore fields are retrieved, they are parsed and returned
# as instances of Sequel::Postgres::HStore.  HStore is
# a DelegateClass of Hash, so it mostly acts like a hash, but not
# completely (is_a?(Hash) is false).  If you want the actual hash,
# you can call HStore#to_hash.  This is done so that Sequel does not
# treat a HStore like a Hash by default, which would cause issues.
#
# In addition to the parsers, this extension comes with literalizers
# for HStore using the standard Sequel literalization callbacks, so
# they work with on all adapters.
#
# To turn an existing Hash into an HStore, use Sequel.hstore:
#
#   Sequel.hstore(hash)
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Hash#hstore:
# 
#   hash.hstore
#
# Since the hstore type only supports strings, non string keys and
# values are converted to strings
#
#   Sequel.hstore(foo: 1).to_hash # {'foo'=>'1'}
#   v = Sequel.hstore({})
#   v[:foo] = 1
#   v # {'foo'=>'1'}
#
# However, to make life easier, lookups by key are converted to
# strings (even when accessing the underlying hash directly):
#
#   Sequel.hstore('foo'=>'bar')[:foo] # 'bar'
#   Sequel.hstore('foo'=>'bar').to_hash[:foo] # 'bar'
# 
# HStore instances mostly just delegate to the underlying hash
# instance, so Hash methods that modify the receiver or returned
# modified copies of the receiver may not do string conversion.
# The following methods will handle string conversion, and more
# can be added later if desired:
#
# * \[\]
# * \[\]=
# * assoc
# * delete
# * fetch
# * has_key?
# * has_value?
# * include?
# * key
# * key?
# * member?
# * merge
# * merge!
# * rassoc
# * replace
# * store
# * update
# * value?
#
# If you want to insert a hash into an hstore database column:
#
#   DB[:table].insert(column: Sequel.hstore('foo'=>'bar'))
#
# To use this extension, first load it into your Sequel::Database instance:
#
#   DB.extension :pg_hstore
#
# See the {schema modification guide}[rdoc-ref:doc/schema_modification.rdoc]
# for details on using hstore columns in CREATE/ALTER TABLE statements.
#
# This extension requires the delegate and strscan libraries.
#
# Related module: Sequel::Postgres::HStore

require 'delegate'
require 'strscan'

module Sequel
  module Postgres
    class HStore < DelegateClass(Hash)
      include Sequel::SQL::AliasMethods

      # Parser for PostgreSQL hstore output format.
      class Parser < StringScanner
        # Parse the output format that PostgreSQL uses for hstore
        # columns.  Note that this does not attempt to parse all
        # input formats that PostgreSQL will accept.  For instance,
        # it expects all keys and non-NULL values to be quoted.
        #
        # Return the resulting hash of objects.  This can be called
        # multiple times, it will cache the parsed hash on the first
        # call and use it for subsequent calls.
        def parse
          return @result if @result
          hash = {}
          while !eos?
            skip(/"/)
            k = parse_quoted
            skip(/"\s*=>\s*/)
            if skip(/"/)
              v = parse_quoted
              skip(/"/)
            else
              scan(/NULL/)
              v = nil
            end
            skip(/,\s*/)
            hash[k] = v
          end
          @result = hash
        end
          
        private

        # Parse and unescape a quoted key/value.
        def parse_quoted
          scan(/(\\"|[^"])*/).gsub(/\\(.)/, '\1')
        end
      end

      module DatabaseMethods
        def self.extended(db)
          db.instance_exec do
            add_named_conversion_proc(:hstore, &HStore.method(:parse))
            @schema_type_classes[:hstore] = HStore
          end
        end

        # Handle hstores in bound variables
        def bound_variable_arg(arg, conn)
          case arg
          when HStore
            arg.unquoted_literal
          when Hash
            HStore.new(arg).unquoted_literal
          else
            super
          end
        end

        private

        # Recognize the hstore database type.
        def schema_column_type(db_type)
          db_type == 'hstore' ? :hstore : super
        end

        # Set the :callable_default value if the default value is recognized as an empty hstore.
        def schema_post_process(_)
          super.each do |a|
            h = a[1]
            if h[:type] == :hstore && h[:default] =~ /\A''::hstore\z/
              h[:callable_default] = lambda{HStore.new({})}
            end
          end
        end

        # Typecast value correctly to HStore.  If already an
        # HStore instance, return as is.  If a hash, return
        # an HStore version of it.  If a string, assume it is
        # in PostgreSQL output format and parse it using the
        # parser.
        def typecast_value_hstore(value)
          case value
          when HStore
            value
          when Hash
            HStore.new(value)
          else
            raise Sequel::InvalidValue, "invalid value for hstore: #{value.inspect}"
          end
        end
      end

      # Default proc used for all underlying HStore hashes, so that even
      # if you grab the underlying hash, it will still convert non-string
      # keys to strings during lookup.
      DEFAULT_PROC = lambda{|h, k| h[k.to_s] unless k.is_a?(String)}

      # Undef marshal_{dump,load} methods in the delegate class,
      # so that ruby uses the old style _dump/_load methods defined
      # in the delegate class, instead of the marshal_{dump,load} methods
      # in the Hash class.
      undef_method :marshal_load
      undef_method :marshal_dump

      # Use custom marshal loading, since underlying hash uses a default proc.
      def self._load(args)
        new(Hash[Marshal.load(args)])
      end

      # Parse the given string into an HStore, assuming the str is in PostgreSQL
      # hstore output format.
      def self.parse(str)
        new(Parser.new(str).parse)
      end

      # Override methods that accept key argument to convert to string.
      %w'[] delete has_key? include? key? member? assoc'.each do |m|
        class_eval("def #{m}(k) super(k.to_s) end", __FILE__, __LINE__)
      end

      # Override methods that accept value argument to convert to string unless nil.
      %w'has_value? value? key rassoc'.each do |m|
        class_eval("def #{m}(v) super(convert_value(v)) end", __FILE__, __LINE__)
      end

      # Override methods that accept key and value arguments to convert to string appropriately.
      %w'[]= store'.each do |m|
        class_eval("def #{m}(k, v) super(k.to_s, convert_value(v)) end", __FILE__, __LINE__)
      end

      # Override methods that take hashes to convert the hashes to using strings for keys and
      # values before using them.
      %w'initialize merge! update replace'.each do |m|
        class_eval("def #{m}(h, &block) super(convert_hash(h), &block) end", __FILE__, __LINE__)
      end

      # Use custom marshal dumping, since underlying hash uses a default proc.
      def _dump(*)
        Marshal.dump(to_a)
      end

      # Override to force the key argument to a string.
      def fetch(key, *args, &block)
        super(key.to_s, *args, &block)
      end

      # Convert the input hash to string keys and values before merging,
      # and return a new HStore instance with the merged hash.
      def merge(hash, &block)
        self.class.new(super(convert_hash(hash), &block))
      end

      # Return the underlying hash used by this HStore instance.
      alias to_hash __getobj__

      # Append a literalize version of the hstore to the sql.
      def sql_literal_append(ds, sql)
        ds.literal_append(sql, unquoted_literal)
        sql << '::hstore'
      end

      # Return a string containing the unquoted, unstring-escaped
      # literal version of the hstore.  Separated out for use by
      # the bound argument code.
      def unquoted_literal
        str = String.new
        comma = false
        commas = ","
        quote = '"'
        kv_sep = "=>"
        null = "NULL"
        each do |k, v|
          str << commas if comma
          str << quote << escape_value(k) << quote
          str << kv_sep
          if v.nil?
            str << null
          else
            str << quote << escape_value(v) << quote
          end
          comma = true
        end
        str
      end

      private

      # Return a new hash based on the input hash with string
      # keys and string or nil values.
      def convert_hash(h)
        hash = Hash.new(&DEFAULT_PROC)
        h.each{|k,v| hash[k.to_s] = convert_value(v)}
        hash
      end

      # Return value v as a string unless it is already nil.
      def convert_value(v)
        v.to_s unless v.nil?
      end

      # Escape key/value strings when literalizing to
      # correctly handle backslash and quote characters.
      def escape_value(k)
        k.to_s.gsub(/("|\\)/, '\\\\\1')
      end
    end
  end

  module SQL::Builders
    # Return a Postgres::HStore proxy for the given hash.
    def hstore(v)
      case v
      when Postgres::HStore
        v
      when Hash
        Postgres::HStore.new(v)
      else
        # May not be defined unless the pg_hstore_ops extension is used
        hstore_op(v)
      end
    end
  end

  Database.register_extension(:pg_hstore, Postgres::HStore::DatabaseMethods)
end

# :nocov:
if Sequel.core_extensions?
  class Hash
    # Create a new HStore using the receiver as the input
    # hash.  Note that the HStore created will not use the
    # receiver as the backing store, since it has to
    # modify the hash.  To get the new backing store, use:
    #
    #   hash.hstore.to_hash
    def hstore
      Sequel::Postgres::HStore.new(self)
    end
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Hash do
      def hstore
        Sequel::Postgres::HStore.new(self)
      end
    end
  end
end
# :nocov:
