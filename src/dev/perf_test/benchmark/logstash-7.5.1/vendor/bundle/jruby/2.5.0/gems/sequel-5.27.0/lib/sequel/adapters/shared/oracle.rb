# frozen-string-literal: true

require_relative '../utils/emulate_offset_with_row_number'

module Sequel
  module Oracle
    Sequel::Database.set_shared_adapter_scheme(:oracle, self)
    
    def self.mock_adapter_setup(db)
      db.instance_exec do
        @server_version = 11000000
        @primary_key_sequences = {}
      end
    end

    module DatabaseMethods
      attr_accessor :autosequence

      def create_sequence(name, opts=OPTS)
        self << create_sequence_sql(name, opts)
      end

      def create_trigger(*args)
        self << create_trigger_sql(*args)
      end

      def current_user
        @current_user ||= metadata_dataset.get{sys_context('USERENV', 'CURRENT_USER')}
      end

      def drop_sequence(name)
        self << drop_sequence_sql(name)
      end

      def database_type
        :oracle
      end

      def foreign_key_list(table, opts=OPTS)
        m = output_identifier_meth
        im = input_identifier_meth
        schema, table = schema_and_table(table)
        ds = metadata_dataset.
          from{[all_cons_columns.as(:pc), all_constraints.as(:p), all_cons_columns.as(:fc), all_constraints.as(:f)]}.
          where{{
            f[:table_name]=>im.call(table),
            f[:constraint_type]=>'R',
            p[:owner]=>f[:r_owner],
            p[:constraint_name]=>f[:r_constraint_name],
            pc[:owner]=>p[:owner],
            pc[:constraint_name]=>p[:constraint_name],
            pc[:table_name]=>p[:table_name],
            fc[:owner]=>f[:owner],
            fc[:constraint_name]=>f[:constraint_name],
            fc[:table_name]=>f[:table_name],
            fc[:position]=>pc[:position]}}.
          select{[p[:table_name].as(:table), pc[:column_name].as(:key), fc[:column_name].as(:column), f[:constraint_name].as(:name)]}.
          order{[:table, fc[:position]]}
        ds = ds.where{{f[:schema_name]=>im.call(schema)}} if schema

        fks = {}
        ds.each do |r|
          if fk = fks[r[:name]]
            fk[:columns] << m.call(r[:column])
            fk[:key] << m.call(r[:key])
          else
            fks[r[:name]] = {:name=>m.call(r[:name]), :columns=>[m.call(r[:column])], :table=>m.call(r[:table]), :key=>[m.call(r[:key])]}
          end
        end
        fks.values
      end

      def freeze
        current_user
        server_version
        @conversion_procs.freeze
        super
      end

      # Oracle namespaces indexes per table.
      def global_index_namespace?
        false
      end

      IGNORE_OWNERS = %w'APEX_040000 CTXSYS EXFSYS MDSYS OLAPSYS ORDDATA ORDSYS SYS SYSTEM XDB XDBMETADATA XDBPM XFILES WMSYS'.freeze

      def tables(opts=OPTS)
        m = output_identifier_meth
        metadata_dataset.from(:all_tables).
          server(opts[:server]).
          where(:dropped=>'NO').
          exclude(:owner=>IGNORE_OWNERS).
          select(:table_name).
          map{|r| m.call(r[:table_name])}
      end

      def views(opts=OPTS) 
        m = output_identifier_meth
        metadata_dataset.from(:all_views).
          server(opts[:server]).
          exclude(:owner=>IGNORE_OWNERS).
          select(:view_name).
          map{|r| m.call(r[:view_name])}
      end 
 
      def view_exists?(name) 
        m = input_identifier_meth
        metadata_dataset.from(:all_views).
          exclude(:owner=>IGNORE_OWNERS).
          where(:view_name=>m.call(name)).
          count > 0
      end 

      # The version of the Oracle server, used for determining capability.
      def server_version(server=nil)
        return @server_version if @server_version
        @server_version = synchronize(server) do |conn|
          (conn.server_version rescue nil) if conn.respond_to?(:server_version)
        end
        unless @server_version
          @server_version = if m = /(\d+)\.(\d+)\.?(\d+)?\.?(\d+)?/.match(fetch("select version from PRODUCT_COMPONENT_VERSION where lower(product) like 'oracle%'").single_value)
            (m[1].to_i*1000000) + (m[2].to_i*10000) + (m[3].to_i*100) + m[4].to_i
          else
            0
          end
        end
        @server_version
      end


      # Oracle supports deferrable constraints.
      def supports_deferrable_constraints?
        true
      end

      # Oracle supports transaction isolation levels.
      def supports_transaction_isolation_levels?
        true
      end

      private

      def alter_table_sql(table, op)
        case op[:op]
        when :add_column
          if op[:primary_key]
            sqls = []
            sqls << alter_table_sql(table, op.merge(:primary_key=>nil))
            if op[:auto_increment]
              seq_name = default_sequence_name(table, op[:name])
              sqls << drop_sequence_sql(seq_name)
              sqls << create_sequence_sql(seq_name, op)
              sqls << "UPDATE #{quote_schema_table(table)} SET #{quote_identifier(op[:name])} = #{seq_name}.nextval"
            end
            sqls << "ALTER TABLE #{quote_schema_table(table)} ADD PRIMARY KEY (#{quote_identifier(op[:name])})"
            sqls
          else
             "ALTER TABLE #{quote_schema_table(table)} ADD #{column_definition_sql(op)}"
          end
        when :set_column_null
          "ALTER TABLE #{quote_schema_table(table)} MODIFY #{quote_identifier(op[:name])} #{op[:null] ? 'NULL' : 'NOT NULL'}"
        when :set_column_type
          "ALTER TABLE #{quote_schema_table(table)} MODIFY #{quote_identifier(op[:name])} #{type_literal(op)}"
        when :set_column_default
          "ALTER TABLE #{quote_schema_table(table)} MODIFY #{quote_identifier(op[:name])} DEFAULT #{literal(op[:default])}"
        else
          super(table, op)
        end
      end

      def auto_increment_sql
        ''
      end

      def create_sequence_sql(name, opts=OPTS)
        "CREATE SEQUENCE #{quote_identifier(name)} start with #{opts [:start_with]||1} increment by #{opts[:increment_by]||1} nomaxvalue"
      end

      def create_table_from_generator(name, generator, options)
        drop_statement, create_statements = create_table_sql_list(name, generator, options)
        (execute_ddl(drop_statement) rescue nil) if drop_statement
        create_statements.each{|sql| execute_ddl(sql)}
      end

      def create_table_sql_list(name, generator, options=OPTS)
        statements = [create_table_sql(name, generator, options)]
        drop_seq_statement = nil
        generator.columns.each do |c|
          if c[:auto_increment]
            c[:sequence_name] ||= default_sequence_name(name, c[:name])
            unless c[:create_sequence] == false
              drop_seq_statement = drop_sequence_sql(c[:sequence_name])
              statements << create_sequence_sql(c[:sequence_name], c)
            end
            unless c[:create_trigger] == false
              c[:trigger_name] ||= "BI_#{name}_#{c[:name]}"
              trigger_definition = <<-end_sql
              BEGIN
                IF :NEW.#{quote_identifier(c[:name])} IS NULL THEN
                  SELECT #{c[:sequence_name]}.nextval INTO :NEW.#{quote_identifier(c[:name])} FROM dual;
                END IF;
              END;
              end_sql
              statements << create_trigger_sql(name, c[:trigger_name], trigger_definition, {:events => [:insert]})
            end
          end
        end
        [drop_seq_statement, statements]
      end

      def create_trigger_sql(table, name, definition, opts=OPTS)
        events = opts[:events] ? Array(opts[:events]) : [:insert, :update, :delete]
        sql = <<-end_sql
          CREATE#{' OR REPLACE' if opts[:replace]} TRIGGER #{quote_identifier(name)}
          #{opts[:after] ? 'AFTER' : 'BEFORE'} #{events.map{|e| e.to_s.upcase}.join(' OR ')} ON #{quote_schema_table(table)}
          REFERENCING NEW AS NEW FOR EACH ROW
          #{definition}
        end_sql
        sql
      end

      DATABASE_ERROR_REGEXPS = {
        /unique constraint .+ violated/ => UniqueConstraintViolation,
        /integrity constraint .+ violated/ => ForeignKeyConstraintViolation,
        /check constraint .+ violated/ => CheckConstraintViolation,
        /cannot insert NULL into|cannot update .+ to NULL/ => NotNullConstraintViolation,
        /can't serialize access for this transaction/ => SerializationFailure,
        /resource busy and acquire with NOWAIT specified or timeout/ => DatabaseLockTimeout,
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      def default_sequence_name(table, column)
        "seq_#{table}_#{column}"
      end

      def drop_sequence_sql(name)
        "DROP SEQUENCE #{quote_identifier(name)}"
      end

      def remove_cached_schema(table)
        Sequel.synchronize{@primary_key_sequences.delete(table)}
        super
      end
      
      TRANSACTION_ISOLATION_LEVELS = {:uncommitted=>'READ COMMITTED'.freeze,
        :committed=>'READ COMMITTED'.freeze,
        :repeatable=>'SERIALIZABLE'.freeze,
        :serializable=>'SERIALIZABLE'.freeze}.freeze
      # Oracle doesn't support READ UNCOMMITTED OR REPEATABLE READ transaction
      # isolation levels, so upgrade to the next highest level in those cases.
      def set_transaction_isolation_sql(level)
        "SET TRANSACTION ISOLATION LEVEL #{TRANSACTION_ISOLATION_LEVELS[level]}"
      end
    
      def sequence_for_table(table)
        return nil unless autosequence
        Sequel.synchronize{return @primary_key_sequences[table] if @primary_key_sequences.has_key?(table)}

        begin
          sch = schema(table)
        rescue Sequel::Error
          return nil
        end

        pk = sch.select{|k, v| v[:primary_key]}
        pks = if pk.length == 1
          seq = "seq_#{table}_#{pk.first.first}"
          seq.to_sym unless from(:user_sequences).where(:sequence_name=>input_identifier_meth.call(seq)).empty?
        end
        Sequel.synchronize{@primary_key_sequences[table] = pks}
      end

      # Oracle supports CREATE OR REPLACE VIEW.
      def supports_create_or_replace_view?
        true
      end

      # Oracle's integer/:number type handles larger values than
      # most other databases's bigint types, so it should be
      # safe to use for Bignum.
      def type_literal_generic_bignum_symbol(column)
        :integer
      end

      # Oracle doesn't have a time type, so use timestamp for all
      # time columns.
      def type_literal_generic_only_time(column)
        :timestamp
      end

      # Oracle doesn't have a boolean type or even a reasonable
      # facsimile.  Using a char(1) seems to be the recommended way.
      def type_literal_generic_trueclass(column)
        :'char(1)'
      end

      # SQL fragment for showing a table is temporary
      def temporary_table_sql
        'GLOBAL TEMPORARY '
      end

      # Oracle uses clob for text types.
      def uses_clob_for_text?
        true
      end

      # Oracle supports views with check option, but not local.
      def view_with_check_option_support
        true
      end
    end

    module DatasetMethods
      ROW_NUMBER_EXPRESSION = LiteralString.new('ROWNUM').freeze
      BITAND_PROC = lambda{|a, b| Sequel.lit(["CAST(BITAND(", ", ", ") AS INTEGER)"], a, b)}

      include(Module.new do
        Dataset.def_sql_method(self, :select, %w'with select distinct columns from join where group having compounds order limit lock')
      end)

      def complex_expression_sql_append(sql, op, args)
        case op
        when :&
          complex_expression_arg_pairs_append(sql, args, &BITAND_PROC)
        when :|
          complex_expression_arg_pairs_append(sql, args){|a, b| Sequel.lit(["(", " - ", " + ", ")"], a, complex_expression_arg_pairs([a, b], &BITAND_PROC), b)}
        when :^
          complex_expression_arg_pairs_append(sql, args) do |*x|
            s1 = complex_expression_arg_pairs(x){|a, b| Sequel.lit(["(", " - ", " + ", ")"], a, complex_expression_arg_pairs([a, b], &BITAND_PROC), b)}
            s2 = complex_expression_arg_pairs(x, &BITAND_PROC)
            Sequel.lit(["(", " - ", ")"], s1, s2)
          end
        when :~, :'!~', :'~*', :'!~*'
          raise InvalidOperation, "Pattern matching via regular expressions is not supported in this Oracle version" unless supports_regexp?
          if op == :'!~' || op == :'!~*'
            sql << 'NOT '
          end
          sql << 'REGEXP_LIKE('
          literal_append(sql, args[0])
          sql << ','
          literal_append(sql, args[1])
          if op == :'~*' || op == :'!~*'
            sql << ", 'i'"
          end
          sql << ')'
        when :%, :<<, :>>, :'B~'
          complex_expression_emulate_append(sql, op, args)
        else
          super
        end
      end

      # Oracle doesn't support CURRENT_TIME, as it doesn't have
      # a type for storing just time values without a date, so
      # use CURRENT_TIMESTAMP in its place.
      def constant_sql_append(sql, c)
        if c == :CURRENT_TIME
          super(sql, :CURRENT_TIMESTAMP)
        else
          super
        end
      end

      # Oracle uses MINUS instead of EXCEPT, and doesn't support EXCEPT ALL
      def except(dataset, opts=OPTS)
        raise(Sequel::Error, "EXCEPT ALL not supported") if opts[:all]
        compound_clone(:minus, dataset, opts)
      end

      # Use a custom expression with EXISTS to determine whether a dataset
      # is empty.
      def empty?
        db[:dual].where(@opts[:offset] ? exists : unordered.exists).get(1) == nil
      end

      # Oracle requires SQL standard datetimes
      def requires_sql_standard_datetimes?
        true
      end

      # Create a copy of this dataset associated to the given sequence name,
      # which will be used when calling insert to find the most recently
      # inserted value for the sequence.
      def sequence(s)
        clone(:sequence=>s)
      end

      # Handle LIMIT by using a unlimited subselect filtered with ROWNUM,
      # unless Oracle 12 is used.
      def select_sql
        return super if @opts[:sql]
        return super if supports_fetch_next_rows?

        o = @opts[:offset]
        if o && o != 0
          columns = clone(:append_sql=>String.new, :placeholder_literal_null=>true).columns
          dsa1 = dataset_alias(1)
          rn = row_number_column
          limit = @opts[:limit]
          ds = unlimited.
            from_self(:alias=>dsa1).
            select_append(ROW_NUMBER_EXPRESSION.as(rn)).
            from_self(:alias=>dsa1).
            select(*columns).
            where(SQL::Identifier.new(rn) > o)
          ds = ds.where(SQL::Identifier.new(rn) <= Sequel.+(o, limit)) if limit
          sql = @opts[:append_sql] || String.new
          subselect_sql_append(sql, ds)
          sql
        elsif limit = @opts[:limit]
          ds = unlimited
          # Lock doesn't work in subselects, so don't use a subselect when locking.
          # Don't use a subselect if custom SQL is used, as it breaks somethings.
          ds = ds.from_self unless @opts[:lock]
          sql = @opts[:append_sql] || String.new
          subselect_sql_append(sql, ds.where(SQL::ComplexExpression.new(:<=, ROW_NUMBER_EXPRESSION, limit)))
          sql
        else
          super
        end
      end

      def select_limit_sql(sql)
        return unless supports_fetch_next_rows?

        if offset = @opts[:offset]
          sql << " OFFSET "
          literal_append(sql, offset)
          sql << " ROWS"
        end

        if limit = @opts[:limit]
          sql << " FETCH NEXT "
          literal_append(sql, limit)
          sql << " ROWS ONLY"
        end
      end

      # Oracle requires recursive CTEs to have column aliases.
      def recursive_cte_requires_column_aliases?
        true
      end

      def supports_cte?(type=:select)
        type == :select
      end

      # Oracle does not support derived column lists
      def supports_derived_column_lists?
        false
      end

      # Oracle supports FETCH NEXT ROWS since 12c, but it doesn't work when
      # locking or when skipping locked rows.
      def supports_fetch_next_rows?
        server_version >= 12000000 && !(@opts[:lock] || @opts[:skip_locked])
      end

      # Oracle supports GROUP BY CUBE
      def supports_group_cube?
        true
      end

      # Oracle supports GROUP BY ROLLUP
      def supports_group_rollup?
        true
      end

      # Oracle supports GROUPING SETS
      def supports_grouping_sets?
        true
      end

      # Oracle does not support INTERSECT ALL or EXCEPT ALL
      def supports_intersect_except_all?
        false
      end

      # Oracle does not support IS TRUE.
      def supports_is_true?
        false
      end
      
      # Oracle does not support limits in correlated subqueries.
      def supports_limits_in_correlated_subqueries?
        false
      end
    
      # Oracle supports NOWAIT.
      def supports_nowait?
        true
      end

      # Oracle does not support offsets in correlated subqueries.
      def supports_offsets_in_correlated_subqueries?
        false
      end

      # Oracle does not support SELECT *, column
      def supports_select_all_and_column?
        false
      end
      
      # Oracle supports SKIP LOCKED.
      def supports_skip_locked?
        true
      end

      # Oracle supports timezones in literal timestamps.
      def supports_timestamp_timezones?
        true
      end
      
      # Oracle does not support WHERE 'Y' for WHERE TRUE.
      def supports_where_true?
        false
      end

      # Oracle supports window functions
      def supports_window_functions?
        true
      end

      # The version of the database server
      def server_version
        db.server_version(@opts[:server])
      end

      # Oracle 10+ supports pattern matching via regular expressions
      def supports_regexp?
        server_version >= 10010002
      end

      private

      # Allow preparing prepared statements, since determining the prepared sql to use for
      # a prepared statement requires calling prepare on that statement.
      def allow_preparing_prepared_statements?
        true
      end

      # Oracle doesn't support the use of AS when aliasing a dataset.  It doesn't require
      # the use of AS anywhere, so this disables it in all cases.  Oracle also does not support
      # derived column lists in aliases.
      def as_sql_append(sql, aliaz, column_aliases=nil)
        raise Error, "oracle does not support derived column lists" if column_aliases
        sql << ' '
        quote_identifier_append(sql, aliaz)
      end

      # The strftime format to use when literalizing the time.
      def default_timestamp_format
        "TIMESTAMP '%Y-%m-%d %H:%M:%S%N %z'"
      end

      def empty_from_sql
        ' FROM DUAL'
      end

      # There is no function on Oracle that does character length
      # and respects trailing spaces (datalength respects trailing spaces, but
      # counts bytes instead of characters).  Use a hack to work around the
      # trailing spaces issue.
      def emulate_function?(name)
        name == :char_length
      end

      # Oracle treats empty strings like NULL values, and doesn't support
      # char_length, so make char_length use length with a nonempty string.
      # Unfortunately, as Oracle treats the empty string as NULL, there is
      # no way to get trim to return an empty string instead of nil if
      # the string only contains spaces.
      def emulate_function_sql_append(sql, f)
        if f.name == :char_length
          literal_append(sql, Sequel::SQL::Function.new(:length, Sequel.join([f.args.first, 'x'])) - 1)
        end
      end
      
      # If this dataset is associated with a sequence, return the most recently
      # inserted sequence value.
      def execute_insert(sql, opts=OPTS)
        opts = Hash[opts]
        if f = @opts[:from]
          opts[:table] = f.first
        end
        opts[:sequence] = @opts[:sequence]
        super
      end

      # Use a colon for the timestamp offset, since Oracle appears to require it.
      def format_timestamp_offset(hour, minute)
        sprintf("%+03i:%02i", hour, minute)
      end

      # Oracle doesn't support empty values when inserting.
      def insert_supports_empty_values?
        false
      end

      # Use string in hex format for blob data.
      def literal_blob_append(sql, v)
        sql << "'" << v.unpack("H*").first << "'"
      end

      # Oracle uses 'N' for false values.
      def literal_false
        "'N'"
      end

      # Oracle uses the SQL standard of only doubling ' inside strings.
      def literal_string_append(sql, v)
        sql << "'" << v.gsub("'", "''") << "'"
      end

      # Oracle uses 'Y' for true values.
      def literal_true
        "'Y'"
      end

      # Oracle can insert multiple rows using a UNION
      def multi_insert_sql_strategy
        :union
      end

      # Use SKIP LOCKED if skipping locked rows.
      def select_lock_sql(sql)
        super

        if @opts[:lock]
          if @opts[:skip_locked]
            sql << " SKIP LOCKED"
          elsif @opts[:nowait]
            sql << " NOWAIT"
          end
        end
      end

      # Oracle supports quoted function names.
      def supports_quoted_function_names?
        true
      end
    end
  end
end
