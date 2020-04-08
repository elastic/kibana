# frozen-string-literal: true

require_relative '../utils/emulate_offset_with_row_number'

module Sequel
  module DB2
    Sequel::Database.set_shared_adapter_scheme(:db2, self)

    module DatabaseMethods
      # Whether to use clob as the generic File type, false by default.
      attr_accessor :use_clob_as_blob

      def database_type
        :db2
      end
      
      # Return the database version as a string.  Don't rely on this,
      # it may return an integer in the future.
      def db2_version
        return @db2_version if defined?(@db2_version)
        @db2_version = metadata_dataset.with_sql("select service_level from sysibmadm.env_inst_info").first[:service_level]
      end
      alias_method :server_version, :db2_version

      def freeze
        db2_version
        offset_strategy
        super
      end

      # Use SYSIBM.SYSCOLUMNS to get the information on the tables.
      def schema_parse_table(table, opts = OPTS)
        m = output_identifier_meth(opts[:dataset])
        im = input_identifier_meth(opts[:dataset])
        metadata_dataset.with_sql("SELECT * FROM SYSIBM.SYSCOLUMNS WHERE TBNAME = #{literal(im.call(table))} ORDER BY COLNO").
          collect do |column| 
            column[:db_type] = column.delete(:typename)
            if column[:db_type] =~ /\A(VAR)?CHAR\z/
              column[:db_type] << "(#{column[:length]})"
            end
            if column[:db_type] == "DECIMAL"
              column[:db_type] << "(#{column[:longlength]},#{column[:scale]})"
            end
            column[:allow_null] = column.delete(:nulls) == 'Y'
            identity = column.delete(:identity) == 'Y'
            if column[:primary_key] = identity || !column[:keyseq].nil?
              column[:auto_increment] = identity
            end
            column[:type]        = schema_column_type(column[:db_type])
            column[:max_length]  = column[:longlength] if column[:type] == :string
            [ m.call(column.delete(:name)), column]
          end
      end

      # Use SYSCAT.TABLES to get the tables for the database
      def tables
        metadata_dataset.
          with_sql("SELECT TABNAME FROM SYSCAT.TABLES WHERE TYPE='T' AND OWNER = #{literal(input_identifier_meth.call(opts[:user]))}").
          all.map{|h| output_identifier_meth.call(h[:tabname]) }
      end

      # Use SYSCAT.TABLES to get the views for the database
      def views
        metadata_dataset.
          with_sql("SELECT TABNAME FROM SYSCAT.TABLES WHERE TYPE='V' AND OWNER = #{literal(input_identifier_meth.call(opts[:user]))}").
          all.map{|h| output_identifier_meth.call(h[:tabname]) }
      end

      # Use SYSCAT.INDEXES to get the indexes for the table
      def indexes(table, opts = OPTS)
        m = output_identifier_meth
        table = table.value if table.is_a?(Sequel::SQL::Identifier)
        indexes = {}
        metadata_dataset.
         from(Sequel[:syscat][:indexes]).
         select(:indname, :uniquerule, :colnames).
         where(:tabname=>input_identifier_meth.call(table), :system_required=>0).
         each do |r|
          indexes[m.call(r[:indname])] = {:unique=>(r[:uniquerule]=='U'), :columns=>r[:colnames][1..-1].split('+').map{|v| m.call(v)}}
        end
        indexes
      end

      def offset_strategy
        return @offset_strategy if defined?(@offset_strategy)

        @offset_strategy = case strategy = opts[:offset_strategy].to_s
        when "limit_offset", "offset_fetch"
          opts[:offset_strategy] = strategy.to_sym
        else
          opts[:offset_strategy] = :emulate
        end
      end

      # DB2 supports transaction isolation levels.
      def supports_transaction_isolation_levels?
        true
      end

      # On DB2, a table might need to be REORGed if you are testing existence
      # of it.  This REORGs automatically if the database raises a specific
      # error that indicates it should be REORGed.
      def table_exists?(name)
        v ||= false # only retry once
        sch, table_name = schema_and_table(name)
        name = SQL::QualifiedIdentifier.new(sch, table_name) if sch
        from(name).first
        true
      rescue DatabaseError => e
        if e.to_s =~ /Operation not allowed for reason code "7" on table/ && v == false
          # table probably needs reorg
          reorg(name)
          v = true
          retry 
        end
        false
      end

      private

      def alter_table_sql(table, op)
        case op[:op]
        when :add_column
          if op[:primary_key] && op[:auto_increment] && op[:type] == Integer
            [
            "ALTER TABLE #{quote_schema_table(table)} ADD #{column_definition_sql(op.merge(:auto_increment=>false, :primary_key=>false, :default=>0, :null=>false))}",
            "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{literal(op[:name])} DROP DEFAULT",
            "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{literal(op[:name])} SET #{auto_increment_sql}"
            ]
          else
            "ALTER TABLE #{quote_schema_table(table)} ADD #{column_definition_sql(op)}"
          end
        when :drop_column
          "ALTER TABLE #{quote_schema_table(table)} DROP #{column_definition_sql(op)}"
        when :rename_column       # renaming is only possible after db2 v9.7
          "ALTER TABLE #{quote_schema_table(table)} RENAME COLUMN #{quote_identifier(op[:name])} TO #{quote_identifier(op[:new_name])}"
        when :set_column_type
          "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{quote_identifier(op[:name])} SET DATA TYPE #{type_literal(op)}"
        when :set_column_default
          "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{quote_identifier(op[:name])} SET DEFAULT #{literal(op[:default])}"
        when :add_constraint
          if op[:type] == :unique
            sqls = op[:columns].map{|c| ["ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{quote_identifier(c)} SET NOT NULL", reorg_sql(table)]}
            sqls << super
            sqls.flatten
          else
            super
          end
        else
          super
        end
      end

      # REORG the related table whenever it is altered.  This is not always
      # required, but it is necessary for compatibilty with other Sequel
      # code in many cases.
      def apply_alter_table(name, ops)
        alter_table_sql_list(name, ops).each do |sql|
          execute_ddl(sql)
          reorg(name)
        end
      end

      # DB2 uses an identity column for autoincrement.
      def auto_increment_sql
        'GENERATED ALWAYS AS IDENTITY'
      end

      # DB2 does not allow adding primary key constraints to NULLable columns.
      def can_add_primary_key_constraint_on_nullable_columns?
        false
      end

      # Supply columns with NOT NULL if they are part of a composite
      # primary key or unique constraint
      def column_list_sql(g)
        ks = []
        g.constraints.each{|c| ks = c[:columns] if [:primary_key, :unique].include?(c[:type])} 
        g.columns.each{|c| c[:null] = false if ks.include?(c[:name]) }
        super
      end

      # Insert data from the current table into the new table after
      # creating the table, since it is not possible to do it in one step.
      def create_table_as(name, sql, options)
        super
        from(name).insert(sql.is_a?(Dataset) ? sql : dataset.with_sql(sql))
      end

      # DB2 requires parens around the SELECT, and DEFINITION ONLY at the end.
      def create_table_as_sql(name, sql, options)
        "#{create_table_prefix_sql(name, options)} AS (#{sql}) DEFINITION ONLY"
      end

      # Here we use DGTT which has most backward compatibility, which uses
      # DECLARE instead of CREATE. CGTT can only be used after version 9.7.
      # http://www.ibm.com/developerworks/data/library/techarticle/dm-0912globaltemptable/
      def create_table_prefix_sql(name, options)
        if options[:temp]
          "DECLARE GLOBAL TEMPORARY TABLE #{quote_identifier(name)}"
        else
          super
        end
      end

      DATABASE_ERROR_REGEXPS = {
        /DB2 SQL Error: SQLCODE=-803, SQLSTATE=23505|One or more values in the INSERT statement, UPDATE statement, or foreign key update caused by a DELETE statement are not valid because the primary key, unique constraint or unique index/ => UniqueConstraintViolation,
        /DB2 SQL Error: (SQLCODE=-530, SQLSTATE=23503|SQLCODE=-532, SQLSTATE=23504)|The insert or update value of the FOREIGN KEY .+ is not equal to any value of the parent key of the parent table|A parent row cannot be deleted because the relationship .+ restricts the deletion/ => ForeignKeyConstraintViolation,
        /DB2 SQL Error: SQLCODE=-545, SQLSTATE=23513|The requested operation is not allowed because a row does not satisfy the check constraint/ => CheckConstraintViolation,
        /DB2 SQL Error: SQLCODE=-407, SQLSTATE=23502|Assignment of a NULL value to a NOT NULL column/ => NotNullConstraintViolation,
        /DB2 SQL Error: SQLCODE=-911, SQLSTATE=40001|The current transaction has been rolled back because of a deadlock or timeout/ => SerializationFailure,
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      # DB2 has issues with quoted identifiers, so
      # turn off database quoting by default.
      def quote_identifiers_default
        false
      end

      # DB2 uses RENAME TABLE to rename tables.
      def rename_table_sql(name, new_name)
        "RENAME TABLE #{quote_schema_table(name)} TO #{quote_schema_table(new_name)}"
      end

      # Run the REORG TABLE command for the table, necessary when
      # the table has been altered.
      def reorg(table)
        execute_ddl(reorg_sql(table))
      end

      # The SQL to use for REORGing a table.
      def reorg_sql(table)
        "CALL SYSPROC.ADMIN_CMD(#{literal("REORG TABLE #{quote_schema_table(table)}")})"
      end

      # Treat clob as blob if use_clob_as_blob is true
      def schema_column_type(db_type)
        (use_clob_as_blob && db_type.downcase == 'clob') ? :blob : super
      end

      # SQL to set the transaction isolation level
      def set_transaction_isolation_sql(level)
        "SET CURRENT ISOLATION #{Database::TRANSACTION_ISOLATION_LEVELS[level]}"
      end

      # We uses the clob type by default for Files.
      # Note: if user select to use blob, then insert statement should use 
      # use this for blob value:
      #     cast(X'fffefdfcfbfa' as blob(2G))
      def type_literal_generic_file(column)
        use_clob_as_blob ? :clob : :blob
      end

      # DB2 uses smallint to store booleans.
      def type_literal_generic_trueclass(column)
        :smallint
      end
      alias type_literal_generic_falseclass type_literal_generic_trueclass

      # DB2 uses clob for text types.
      def uses_clob_for_text?
        true
      end

      # DB2 supports views with check option.
      def view_with_check_option_support
        :local
      end
    end

    module DatasetMethods
      include EmulateOffsetWithRowNumber

      BITWISE_METHOD_MAP = {:& =>:BITAND, :| => :BITOR, :^ => :BITXOR, :'B~'=>:BITNOT}.freeze

      # DB2 casts strings using RTRIM and CHAR instead of VARCHAR.
      def cast_sql_append(sql, expr, type)
        if(type == String)
          sql << "RTRIM(CHAR("
          literal_append(sql, expr)
          sql << "))"
        else
          super
        end
      end

      def complex_expression_sql_append(sql, op, args)
        case op
        when :&, :|, :^, :%, :<<, :>>
          complex_expression_emulate_append(sql, op, args)
        when :'B~'
          literal_append(sql, SQL::Function.new(:BITNOT, *args))
        when :extract
          sql << args[0].to_s
          sql << '('
          literal_append(sql, args[1])
          sql << ')'
        else
          super
        end
      end

      def quote_identifiers?
        @opts.fetch(:quote_identifiers, false)
      end

      def supports_cte?(type=:select)
        type == :select
      end

      # DB2 supports GROUP BY CUBE
      def supports_group_cube?
        true
      end

      # DB2 supports GROUP BY ROLLUP
      def supports_group_rollup?
        true
      end

      # DB2 supports GROUPING SETS
      def supports_grouping_sets?
        true
      end

      # DB2 does not support IS TRUE.
      def supports_is_true?
        false
      end

      # DB2 supports lateral subqueries
      def supports_lateral_subqueries?
        true
      end
      
      # DB2 does not support multiple columns in IN.
      def supports_multiple_column_in?
        false
      end

      # DB2 only allows * in SELECT if it is the only thing being selected.
      def supports_select_all_and_column?
        false
      end

      # DB2 supports window functions
      def supports_window_functions?
        true
      end

      # DB2 does not support WHERE 1.
      def supports_where_true?
        false
      end

      private

      def empty_from_sql
        ' FROM "SYSIBM"."SYSDUMMY1"'
      end

      # Emulate offset with row number by default, and also when the limit_offset
      # strategy is used without a limit, as DB2 doesn't support that syntax with
      # no limit.
      def emulate_offset_with_row_number?
        super && (db.offset_strategy == :emulate || (db.offset_strategy == :limit_offset && !@opts[:limit]))
      end

      # DB2 needs the standard workaround to insert all default values into
      # a table with more than one column.
      def insert_supports_empty_values?
        false
      end

      # Use 0 for false on DB2
      def literal_false
        '0'
      end

      # DB2 doesn't support fractional seconds in times, only fractional seconds in timestamps.
      def literal_sqltime(v)
        v.strftime("'%H:%M:%S'")
      end

      # Use 1 for true on DB2
      def literal_true
        '1'
      end

      # DB2 uses a literal hexidecimal number for blob strings
      def literal_blob_append(sql, v)
        if db.use_clob_as_blob
          super
        else
          sql << "BLOB(X'" << v.unpack("H*").first << "')"
        end
      end

      # DB2 can insert multiple rows using a UNION
      def multi_insert_sql_strategy
        :union
      end

      # Emulate the char_length function with length
      def native_function_name(emulated_function)
        if emulated_function == :char_length
          'length'
        else
          super
        end
      end

      # DB2 does not require that ROW_NUMBER be ordered.
      def require_offset_order?
        false
      end

      # At least some versions of DB do not support NULLS FIRST/LAST.
      def requires_emulating_nulls_first?
        true
      end

      # Modify the sql to limit the number of rows returned.
      # Uses :offset_strategy Database option to determine how to format the
      # limit and offset.
      def select_limit_sql(sql)
        strategy = db.offset_strategy
        return super if strategy == :limit_offset

        if strategy == :offset_fetch && (o = @opts[:offset]) 
          sql << " OFFSET "
          literal_append(sql, o)
          sql << " ROWS"
        end

        if l = @opts[:limit]
          if l == 1
            sql << " FETCH FIRST ROW ONLY"
          else
            sql << " FETCH FIRST "
            literal_append(sql, l)
            sql << " ROWS ONLY"
          end
        end
      end
      
      # DB2 supports quoted function names.
      def supports_quoted_function_names?
        true
      end

      def _truncate_sql(table)
        # "TRUNCATE #{table} IMMEDIATE" is only for newer version of db2, so we
        # use the following one
        "ALTER TABLE #{quote_schema_table(table)} ACTIVATE NOT LOGGED INITIALLY WITH EMPTY TABLE"
      end
    end
  end
end
