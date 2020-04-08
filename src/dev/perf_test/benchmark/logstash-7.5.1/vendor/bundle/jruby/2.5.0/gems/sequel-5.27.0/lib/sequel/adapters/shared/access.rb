# frozen-string-literal: true

require_relative '../utils/emulate_offset_with_reverse_and_count'
require_relative '../utils/unmodified_identifiers'

module Sequel
  module Access
    Sequel::Database.set_shared_adapter_scheme(:access, self)

    module DatabaseMethods
      include UnmodifiedIdentifiers::DatabaseMethods

      def database_type
        :access
      end

      # Doesn't work, due to security restrictions on MSysObjects
      #def tables
      #  from(:MSysObjects).where(:Type=>1, :Flags=>0).select_map(:Name).map(&:to_sym)
      #end
      
      # Access doesn't support renaming tables from an SQL query,
      # so create a copy of the table and then drop the from table.
      def rename_table(from_table, to_table)
        create_table(to_table, :as=>from(from_table))
        drop_table(from_table)
      end

      # Access uses type Counter for an autoincrementing keys
      def serial_primary_key_options
        {:primary_key => true, :type=>:Counter}
      end

      private

      def alter_table_set_column_type_sql(table, op)
        "ALTER COLUMN #{quote_identifier(op[:name])} #{type_literal(op)}"
      end

      # Access doesn't support CREATE TABLE AS, it only supports SELECT INTO.
      # Emulating CREATE TABLE AS using SELECT INTO is only possible if a dataset
      # is given as the argument, it can't work with a string, so raise an
      # Error if a string is given.
      def create_table_as(name, ds, options)
        raise(Error, "must provide dataset instance as value of create_table :as option on Access") unless ds.is_a?(Sequel::Dataset)
        run(ds.into(name).sql)
      end
    
      DATABASE_ERROR_REGEXPS = {
        /The changes you requested to the table were not successful because they would create duplicate values in the index, primary key, or relationship/ => UniqueConstraintViolation,
        /You cannot add or change a record because a related record is required|The record cannot be deleted or changed because table/ => ForeignKeyConstraintViolation,
        /One or more values are prohibited by the validation rule/ => CheckConstraintViolation,
        /You must enter a value in the .+ field|cannot contain a Null value because the Required property for this field is set to True/ => NotNullConstraintViolation,
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      def drop_index_sql(table, op)
        "DROP INDEX #{quote_identifier(op[:name] || default_index_name(table, op[:columns]))} ON #{quote_schema_table(table)}"
      end
      
      # Access doesn't have a 64-bit integer type, so use integer and hope
      # the user isn't using more than 32 bits.
      def type_literal_generic_bignum_symbol(column)
        :integer
      end

      # Access doesn't have a true boolean class, so it uses bit
      def type_literal_generic_trueclass(column)
        :bit
      end
      
      # Access uses image type for blobs
      def type_literal_generic_file(column)
        :image
      end
    end
  
    module DatasetMethods
      include(Module.new do
        Dataset.def_sql_method(self, :select, %w'select distinct limit columns into from join where group order having compounds')
      end)
      include EmulateOffsetWithReverseAndCount
      include UnmodifiedIdentifiers::DatasetMethods

      EXTRACT_MAP = {:year=>"'yyyy'", :month=>"'m'", :day=>"'d'", :hour=>"'h'", :minute=>"'n'", :second=>"'s'"}.freeze
      EXTRACT_MAP.each_value(&:freeze)
      OPS = {:'%'=>' Mod '.freeze, :'||'=>' & '.freeze}.freeze
      CAST_TYPES = {String=>:CStr, Integer=>:CLng, Date=>:CDate, Time=>:CDate, DateTime=>:CDate, Numeric=>:CDec, BigDecimal=>:CDec, File=>:CStr, Float=>:CDbl, TrueClass=>:CBool, FalseClass=>:CBool}.freeze

      # Access doesn't support CASE, so emulate it with nested IIF function calls.
      def case_expression_sql_append(sql, ce)
        literal_append(sql, ce.with_merged_expression.conditions.reverse.inject(ce.default){|exp,(cond,val)| Sequel::SQL::Function.new(:IIF, cond, val, exp)})
      end

      # Access doesn't support CAST, it uses separate functions for
      # type conversion
      def cast_sql_append(sql, expr, type)
        sql << CAST_TYPES.fetch(type, type).to_s
        sql << '('
        literal_append(sql, expr)
        sql << ')'
      end

      def complex_expression_sql_append(sql, op, args)
        case op
        when :ILIKE
          complex_expression_sql_append(sql, :LIKE, args)
        when :'NOT ILIKE'
          complex_expression_sql_append(sql, :'NOT LIKE', args)
        when :'!='
          sql << '('
          literal_append(sql, args[0])
          sql << ' <> '
          literal_append(sql, args[1])
          sql << ')'
        when :'%', :'||'
          sql << '('
          c = false
          op_str = OPS[op]
          args.each do |a|
            sql << op_str if c
            literal_append(sql, a)
            c ||= true
          end
          sql << ')'
        when :**
          sql << '('
          literal_append(sql, args[0])
          sql << ' ^ '
          literal_append(sql, args[1])
          sql << ')'
        when :extract
          part = args[0]
          raise(Sequel::Error, "unsupported extract argument: #{part.inspect}") unless format = EXTRACT_MAP[part]
          sql << "datepart(" << format.to_s << ', '
          literal_append(sql, args[1])
          sql << ')'
        else
          super
        end
      end

      # Use Date(), Now(), and Time() for CURRENT_DATE, CURRENT_TIMESTAMP, and CURRENT_TIME
      def constant_sql_append(sql, constant)
        case constant
        when :CURRENT_DATE
          sql << 'Date()'
        when :CURRENT_TIMESTAMP
          sql << 'Now()'
        when :CURRENT_TIME
          sql << 'Time()'
        else
          super
        end
      end

      # Emulate cross join by using multiple tables in the FROM clause.
      def cross_join(table)
        clone(:from=>@opts[:from] + [table])
      end

      # Access uses [] to escape metacharacters, instead of backslashes.
      def escape_like(string)
        string.gsub(/[\\*#?\[]/){|m| "[#{m}]"}
      end
   
      # Specify a table for a SELECT ... INTO query.
      def into(table)
        clone(:into => table)
      end

      # Access does not support derived column lists.
      def supports_derived_column_lists?
        false
      end

      # Access doesn't support INTERSECT or EXCEPT
      def supports_intersect_except?
        false
      end

      # Access does not support IS TRUE
      def supports_is_true?
        false
      end
      
      # Access doesn't support JOIN USING
      def supports_join_using?
        false
      end

      # Access does not support multiple columns for the IN/NOT IN operators
      def supports_multiple_column_in?
        false
      end

      # Access doesn't support truncate, so do a delete instead.
      def truncate
        delete
        nil
      end
      
      private

      # Access uses # to quote dates
      def literal_date(d)
        d.strftime('#%Y-%m-%d#')
      end

      # Access uses # to quote datetimes
      def literal_datetime(t)
        t.strftime('#%Y-%m-%d %H:%M:%S#')
      end
      alias literal_time literal_datetime

      # Use 0 for false on MSSQL
      def literal_false
        '0'
      end

      # Use -1 for true on MSSQL
      def literal_true
        '-1'
      end

      # Emulate the char_length function with len
      def native_function_name(emulated_function)
        if emulated_function == :char_length
          'len'
        else
          super
        end
      end

      # Access does not natively support NULLS FIRST/LAST.
      def requires_emulating_nulls_first?
        true
      end

      # Access doesn't support ESCAPE for LIKE.
      def requires_like_escape?
        false
      end

      # Access requires parentheses when joining more than one table
      def select_from_sql(sql)
        if f = @opts[:from]
          sql << ' FROM '
          if (j = @opts[:join]) && !j.empty?
            sql << ('(' * j.length)
          end
          source_list_append(sql, f)
        end
      end

      def select_into_sql(sql)
        if i = @opts[:into]
          sql << " INTO "
          identifier_append(sql, i)
        end
      end

      # Access requires parentheses when joining more than one table
      def select_join_sql(sql)
        if js = @opts[:join]
          js.each do |j|
            literal_append(sql, j)
            sql << ')'
          end
        end
      end

      # Access uses TOP for limits
      def select_limit_sql(sql)
        if l = @opts[:limit]
          sql << " TOP "
          literal_append(sql, l)
        end
      end

      # Access uses [] for quoting identifiers, and can't handle
      # ] inside identifiers.
      def quoted_identifier_append(sql, v)
        sql << '[' << v.to_s << ']'
      end
    end
  end
end
