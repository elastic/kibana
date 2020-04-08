# frozen-string-literal: true

require_relative '../utils/emulate_offset_with_row_number'
require_relative '../utils/split_alter_table'

module Sequel
  module MSSQL
    Sequel::Database.set_shared_adapter_scheme(:mssql, self)

    def self.mock_adapter_setup(db)
      db.instance_exec do
        @server_version = 11000000
      end
    end

    module DatabaseMethods
      FOREIGN_KEY_ACTION_MAP = {0 => :no_action, 1 => :cascade, 2 => :set_null, 3 => :set_default}.freeze

      include Sequel::Database::SplitAlterTable
      
      # Whether to use N'' to quote strings, which allows unicode characters inside the
      # strings.  True by default for compatibility, can be set to false for a possible
      # performance increase.  This sets the default for all datasets created from this
      # Database object.
      attr_accessor :mssql_unicode_strings

      # Execute the given stored procedure with the given name.
      #
      # Options:
      # :args :: Arguments to stored procedure.  For named arguments, this should be a
      #          hash keyed by argument named.  For unnamed arguments, this should be an
      #          array.  Output parameters to the function are specified using :output.
      #          You can also name output parameters and provide a type by using an
      #          array containing :output, the type name, and the parameter name.
      # :server :: The server/shard on which to execute the procedure.
      #
      # This method returns a single hash with the following keys:
      #
      # :result :: The result code of the stored procedure
      # :numrows :: The number of rows affected by the stored procedure
      # output params :: Values for any output paramters, using the name given for the output parameter
      #
      # Because Sequel datasets only support a single result set per query, and retrieving 
      # the result code and number of rows requires a query, this does not support
      # stored procedures which also return result sets.  To handle such stored procedures,
      # you should drop down to the connection/driver level by using Sequel::Database#synchronize
      # to get access to the underlying connection object.
      #
      # Examples:
      #
      #     DB.call_mssql_sproc(:SequelTest, {args: ['input arg', :output]})
      #     DB.call_mssql_sproc(:SequelTest, {args: ['input arg', [:output, 'int', 'varname']]})
      #
      #     named params:
      #     DB.call_mssql_sproc(:SequelTest, args: {
      #       'input_arg1_name' => 'input arg1 value',
      #       'input_arg2_name' => 'input arg2 value',
      #       'output_arg_name' => [:output, 'int', 'varname']
      #     })
      def call_mssql_sproc(name, opts=OPTS)
        args = opts[:args] || []
        names = ['@RC AS RESULT', '@@ROWCOUNT AS NUMROWS']
        declarations = ['@RC int']
        values = []

        if args.is_a?(Hash)
          named_args = true
          args = args.to_a
          method = :each
        else
          method = :each_with_index
        end

        args.public_send(method) do |v, i|
          if named_args
            k = v
            v, type, select = i
            raise Error, "must provide output parameter name when using output parameters with named arguments" if v == :output && !select
          else
            v, type, select = v
          end

          if v == :output
            type ||= "nvarchar(max)"
            if named_args
              varname = select
            else
              varname = "var#{i}"
              select ||= varname
            end
            names << "@#{varname} AS #{quote_identifier(select)}"
            declarations << "@#{varname} #{type}"
            value = "@#{varname} OUTPUT"
          else
            value = literal(v)
          end

          if named_args
            value = "@#{k}=#{value}"
          end

          values << value
        end

        sql = "DECLARE #{declarations.join(', ')}; EXECUTE @RC = #{name} #{values.join(', ')}; SELECT #{names.join(', ')}"

        ds = dataset.with_sql(sql)
        ds = ds.server(opts[:server]) if opts[:server]
        ds.first
      end

      def database_type
        :mssql
      end
      
      # Microsoft SQL Server namespaces indexes per table.
      def global_index_namespace?
        false
      end

      # Return foreign key information using the system views, including
      # :name, :on_delete, and :on_update entries in the hashes.
      def foreign_key_list(table, opts=OPTS)
        m = output_identifier_meth
        im = input_identifier_meth
        schema, table = schema_and_table(table)
        current_schema = m.call(get(Sequel.function('schema_name')))
        fk_action_map = FOREIGN_KEY_ACTION_MAP
        fk = Sequel[:fk]
        fkc = Sequel[:fkc]
        ds = metadata_dataset.from(Sequel.lit('[sys].[foreign_keys]').as(:fk)).
          join(Sequel.lit('[sys].[foreign_key_columns]').as(:fkc), :constraint_object_id => :object_id).
          join(Sequel.lit('[sys].[all_columns]').as(:pc), :object_id => fkc[:parent_object_id],     :column_id => fkc[:parent_column_id]).
          join(Sequel.lit('[sys].[all_columns]').as(:rc), :object_id => fkc[:referenced_object_id], :column_id => fkc[:referenced_column_id]).
          where{{object_schema_name(fk[:parent_object_id]) => im.call(schema || current_schema)}}.
          where{{object_name(fk[:parent_object_id]) => im.call(table)}}.
          select{[fk[:name], 
                  fk[:delete_referential_action], 
                  fk[:update_referential_action], 
                  pc[:name].as(:column), 
                  rc[:name].as(:referenced_column), 
                  object_schema_name(fk[:referenced_object_id]).as(:schema), 
                  object_name(fk[:referenced_object_id]).as(:table)]}.
          order(fk[:name], fkc[:constraint_column_id])
        h = {}
        ds.each do |row|
          if r = h[row[:name]]
            r[:columns] << m.call(row[:column])
            r[:key] << m.call(row[:referenced_column])
          else
            referenced_schema = m.call(row[:schema])
            referenced_table = m.call(row[:table])
            h[row[:name]] = { :name      => m.call(row[:name]), 
                              :table     => (referenced_schema == current_schema) ? referenced_table : Sequel.qualify(referenced_schema, referenced_table),
                              :columns   => [m.call(row[:column])], 
                              :key       => [m.call(row[:referenced_column])], 
                              :on_update => fk_action_map[row[:update_referential_action]], 
                              :on_delete => fk_action_map[row[:delete_referential_action]] }
          end
        end
        h.values
      end

      def freeze
        server_version
        super
      end

      # Use the system tables to get index information
      def indexes(table, opts=OPTS)
        m = output_identifier_meth
        im = input_identifier_meth
        indexes = {}
        table = table.value if table.is_a?(Sequel::SQL::Identifier)
        i = Sequel[:i]
        ds = metadata_dataset.from(Sequel.lit('[sys].[tables]').as(:t)).
         join(Sequel.lit('[sys].[indexes]').as(:i), :object_id=>:object_id).
         join(Sequel.lit('[sys].[index_columns]').as(:ic), :object_id=>:object_id, :index_id=>:index_id).
         join(Sequel.lit('[sys].[columns]').as(:c), :object_id=>:object_id, :column_id=>:column_id).
         select(i[:name], i[:is_unique], Sequel[:c][:name].as(:column)).
         where{{t[:name]=>im.call(table)}}.
         where(i[:is_primary_key]=>0, i[:is_disabled]=>0).
         order(i[:name], Sequel[:ic][:index_column_id])

        if supports_partial_indexes?
          ds = ds.where(i[:has_filter]=>0)
        end

        ds.each do |r|
          index = indexes[m.call(r[:name])] ||= {:columns=>[], :unique=>(r[:is_unique] && r[:is_unique]!=0)}
          index[:columns] << m.call(r[:column])
        end
        indexes
      end

      # The version of the MSSQL server, as an integer (e.g. 10001600 for
      # SQL Server 2008 Express).
      def server_version(server=nil)
        return @server_version if @server_version
        if @opts[:server_version]
          return @server_version = Integer(@opts[:server_version])
        end
        @server_version = synchronize(server) do |conn|
          (conn.server_version rescue nil) if conn.respond_to?(:server_version)
        end
        unless @server_version
          m = /^(\d+)\.(\d+)\.(\d+)/.match(fetch("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar)").single_value.to_s)
          @server_version = (m[1].to_i * 1000000) + (m[2].to_i * 10000) + m[3].to_i
        end
        @server_version
      end
        
      # MSSQL 2008+ supports partial indexes.
      def supports_partial_indexes?
        dataset.send(:is_2008_or_later?)
      end

      # MSSQL supports savepoints, though it doesn't support releasing them
      def supports_savepoints?
        true
      end
      
      # MSSQL supports transaction isolation levels
      def supports_transaction_isolation_levels?
        true
      end

      # MSSQL supports transaction DDL statements.
      def supports_transactional_ddl?
        true
      end

      # Microsoft SQL Server supports using the INFORMATION_SCHEMA to get
      # information on tables.
      def tables(opts=OPTS)
        information_schema_tables('BASE TABLE', opts)
      end

      # Microsoft SQL Server supports using the INFORMATION_SCHEMA to get
      # information on views.
      def views(opts=OPTS)
        information_schema_tables('VIEW', opts)
      end
      
      private
      
      # Add dropping of the default constraint to the list of SQL queries.
      # This is necessary before dropping the column or changing its type.
      def add_drop_default_constraint_sql(sqls, table, column)
        if constraint = default_constraint_name(table, column)
          sqls << "ALTER TABLE #{quote_schema_table(table)} DROP CONSTRAINT #{constraint}"
        end
      end

      # MSSQL uses the IDENTITY(1,1) column for autoincrementing columns.
      def auto_increment_sql
        'IDENTITY(1,1)'
      end
      
      def alter_table_sql(table, op)
        case op[:op]
        when :add_column
          "ALTER TABLE #{quote_schema_table(table)} ADD #{column_definition_sql(op)}"
        when :drop_column
          sqls = []
          add_drop_default_constraint_sql(sqls, table, op[:name])
          sqls << super
        when :rename_column
          "sp_rename #{literal("#{quote_schema_table(table)}.#{quote_identifier(op[:name])}")}, #{literal(metadata_dataset.with_quote_identifiers(false).quote_identifier(op[:new_name]))}, 'COLUMN'"
        when :set_column_type
          sqls = []
          if sch = schema(table)
            if cs = sch.each{|k, v| break v if k == op[:name]; nil}
              cs = cs.dup
              add_drop_default_constraint_sql(sqls, table, op[:name])
              cs[:default] = cs[:ruby_default]
              op = cs.merge!(op)
              default = op.delete(:default)
            end
          end
          sqls << "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{column_definition_sql(op)}"
          sqls << alter_table_sql(table, op.merge(:op=>:set_column_default, :default=>default, :skip_drop_default=>true)) if default
          sqls
        when :set_column_null
          sch = schema(table).find{|k,v| k.to_s == op[:name].to_s}.last
          type = sch[:db_type]
          if [:string, :decimal].include?(sch[:type]) && !["text", "ntext"].include?(type) && (size = (sch[:max_chars] || sch[:column_size]))
            size = "MAX" if size == -1
            type += "(#{size}#{", #{sch[:scale]}" if sch[:scale] && sch[:scale].to_i > 0})"
          end
          "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{quote_identifier(op[:name])} #{type_literal(:type=>type)} #{'NOT ' unless op[:null]}NULL"
        when :set_column_default
          sqls = []
          add_drop_default_constraint_sql(sqls, table, op[:name]) unless op[:skip_drop_default]
          sqls << "ALTER TABLE #{quote_schema_table(table)} ADD CONSTRAINT #{quote_identifier("sequel_#{table}_#{op[:name]}_def")} DEFAULT #{literal(op[:default])} FOR #{quote_identifier(op[:name])}"
        else
          super(table, op)
        end
      end
      
      def begin_savepoint_sql(depth)
        "SAVE TRANSACTION autopoint_#{depth}"
      end

      def begin_transaction_sql
        "BEGIN TRANSACTION"
      end

      # MSSQL does not allow adding primary key constraints to NULLable columns.
      def can_add_primary_key_constraint_on_nullable_columns?
        false
      end

      # Handle MSSQL specific default format.
      def column_schema_normalize_default(default, type)
        if m = /\A(?:\(N?('.*')\)|\(\((-?\d+(?:\.\d+)?)\)\))\z/.match(default)
          default = m[1] || m[2]
        end
        super(default, type)
      end

      # Commit the active transaction on the connection, does not release savepoints.
      def commit_transaction(conn, opts=OPTS)
        log_connection_execute(conn, commit_transaction_sql) unless savepoint_level(conn) > 1
      end

      def commit_transaction_sql
        "COMMIT TRANSACTION"
      end
        
      # MSSQL uses the name of the table to decide the difference between
      # a regular and temporary table, with temporary table names starting with
      # a #.
      def create_table_prefix_sql(name, options)
        "CREATE TABLE #{quote_schema_table(options[:temp] ? "##{name}" : name)}"
      end
      
      # MSSQL doesn't support CREATE TABLE AS, it only supports SELECT INTO.
      # Emulating CREATE TABLE AS using SELECT INTO is only possible if a dataset
      # is given as the argument, it can't work with a string, so raise an
      # Error if a string is given.
      def create_table_as(name, ds, options)
        raise(Error, "must provide dataset instance as value of create_table :as option on MSSQL") unless ds.is_a?(Sequel::Dataset)
        run(ds.into(name).sql)
      end
    
      DATABASE_ERROR_REGEXPS = {
        /Violation of UNIQUE KEY constraint|(Violation of PRIMARY KEY constraint.+)?Cannot insert duplicate key/ => UniqueConstraintViolation,
        /conflicted with the (FOREIGN KEY.*|REFERENCE) constraint/ => ForeignKeyConstraintViolation,
        /conflicted with the CHECK constraint/ => CheckConstraintViolation,
        /column does not allow nulls/ => NotNullConstraintViolation,
        /was deadlocked on lock resources with another process and has been chosen as the deadlock victim/ => SerializationFailure,
        /Lock request time out period exceeded\./ => DatabaseLockTimeout,
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      # The name of the constraint for setting the default value on the table and column.
      # The SQL used to select default constraints utilizes MSSQL catalog views which were introduced in 2005.
      # This method intentionally does not support MSSQL 2000.
      def default_constraint_name(table, column_name)
        if server_version >= 9000000
          table_name = schema_and_table(table).compact.join('.')
          self[Sequel[:sys][:default_constraints]].
            where{{:parent_object_id => Sequel::SQL::Function.new(:object_id, table_name), col_name(:parent_object_id, :parent_column_id) => column_name.to_s}}.
            get(:name)
        end
      end

      def drop_index_sql(table, op)
        "DROP INDEX #{quote_identifier(op[:name] || default_index_name(table, op[:columns]))} ON #{quote_schema_table(table)}"
      end
      
      def index_definition_sql(table_name, index)
        index_name = index[:name] || default_index_name(table_name, index[:columns])
        raise Error, "Partial indexes are not supported for this database" if index[:where] && !supports_partial_indexes?
        if index[:type] == :full_text
          "CREATE FULLTEXT INDEX ON #{quote_schema_table(table_name)} #{literal(index[:columns])} KEY INDEX #{literal(index[:key_index])}"
        else
          "CREATE #{'UNIQUE ' if index[:unique]}#{'CLUSTERED ' if index[:type] == :clustered}INDEX #{quote_identifier(index_name)} ON #{quote_schema_table(table_name)} #{literal(index[:columns])}#{" INCLUDE #{literal(index[:include])}" if index[:include]}#{" WHERE #{filter_expr(index[:where])}" if index[:where]}"
        end
      end

      # Backbone of the tables and views support.
      def information_schema_tables(type, opts)
        m = output_identifier_meth
        metadata_dataset.from(Sequel[:information_schema][:tables].as(:t)).
          select(:table_name).
          where(:table_type=>type, :table_schema=>(opts[:schema]||'dbo').to_s).
          map{|x| m.call(x[:table_name])}
      end

      # Always quote identifiers in the metadata_dataset, so schema parsing works.
      def _metadata_dataset
        super.with_quote_identifiers(true)
      end
      
      # Use sp_rename to rename the table
      def rename_table_sql(name, new_name)
        "sp_rename #{literal(quote_schema_table(name))}, #{quote_identifier(schema_and_table(new_name).pop)}"
      end
      
      def rollback_savepoint_sql(depth)
        "IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION autopoint_#{depth}"
      end
      
      def rollback_transaction_sql
        "IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION"
      end
      
      def schema_column_type(db_type)
        case db_type
        when /\A(?:bit)\z/io
          :boolean
        when /\A(?:(?:small)?money)\z/io
          :decimal
        when /\A(timestamp|rowversion)\z/io
          :blob
        else
          super
        end
      end

      # MSSQL uses the INFORMATION_SCHEMA to hold column information, and
      # parses primary key information from the sysindexes, sysindexkeys,
      # and syscolumns system tables.
      def schema_parse_table(table_name, opts)
        m = output_identifier_meth(opts[:dataset])
        m2 = input_identifier_meth(opts[:dataset])
        tn = m2.call(table_name.to_s)
        info_sch_sch = opts[:information_schema_schema]
        inf_sch_qual = lambda{|s| info_sch_sch ? Sequel.qualify(info_sch_sch, s) : Sequel[s]}
        table_id = metadata_dataset.from(inf_sch_qual.call(Sequel[:sys][:objects])).where(:name => tn).select_map(:object_id).first

        identity_cols = metadata_dataset.from(inf_sch_qual.call(Sequel[:sys][:columns])).
          where(:object_id=>table_id, :is_identity=>true).
          select_map(:name)

        pk_index_id = metadata_dataset.from(inf_sch_qual.call(Sequel[:sys][:sysindexes])).
          where(:id=>table_id, :indid=>1..254){{(status & 2048)=>2048}}.
          get(:indid)
        pk_cols = metadata_dataset.from(inf_sch_qual.call(Sequel[:sys][:sysindexkeys]).as(:sik)).
          join(inf_sch_qual.call(Sequel[:sys][:syscolumns]).as(:sc), :id=>:id, :colid=>:colid).
          where{{sik[:id]=>table_id, sik[:indid]=>pk_index_id}}.
          select_order_map{sc[:name]}

        ds = metadata_dataset.from(inf_sch_qual.call(Sequel[:information_schema][:tables]).as(:t)).
         join(inf_sch_qual.call(Sequel[:information_schema][:columns]).as(:c), :table_catalog=>:table_catalog,
              :table_schema => :table_schema, :table_name => :table_name).
         select{[column_name.as(:column), data_type.as(:db_type), character_maximum_length.as(:max_chars), column_default.as(:default), is_nullable.as(:allow_null), numeric_precision.as(:column_size), numeric_scale.as(:scale)]}.
         where{{c[:table_name]=>tn}}

        if schema = opts[:schema]
          ds = ds.where{{c[:table_schema]=>schema}}
        end

        ds.map do |row|
          if row[:primary_key] = pk_cols.include?(row[:column])
            row[:auto_increment] = identity_cols.include?(row[:column])
          end
          row[:allow_null] = row[:allow_null] == 'YES' ? true : false
          row[:default] = nil if blank_object?(row[:default])
          row[:type] = if row[:db_type] =~ /number|numeric|decimal/i && row[:scale] == 0
            :integer
          else
            schema_column_type(row[:db_type])
          end
          row[:max_length] = row[:max_chars] if row[:type] == :string && row[:max_chars] >= 0
          [m.call(row.delete(:column)), row]
        end
      end

      # Set the mssql_unicode_strings settings from the given options.
      def set_mssql_unicode_strings
        @mssql_unicode_strings = typecast_value_boolean(@opts.fetch(:mssql_unicode_strings, true))
      end
      
      # MSSQL has both datetime and timestamp classes, most people are going
      # to want datetime
      def type_literal_generic_datetime(column)
        :datetime
      end

      # MSSQL doesn't have a true boolean class, so it uses bit
      def type_literal_generic_trueclass(column)
        :bit
      end
      
      # MSSQL uses varbinary(max) type for blobs
      def type_literal_generic_file(column)
        :'varbinary(max)'
      end
      
      # MSSQL supports views with check option, but not local.
      def view_with_check_option_support
        true
      end
    end
  
    module DatasetMethods
      include(Module.new do
        Dataset.def_sql_method(self, :select, %w'with select distinct limit columns into from lock join where group having compounds order')
      end)
      include EmulateOffsetWithRowNumber

      CONSTANT_MAP = {:CURRENT_DATE=>'CAST(CURRENT_TIMESTAMP AS DATE)'.freeze, :CURRENT_TIME=>'CAST(CURRENT_TIMESTAMP AS TIME)'.freeze}.freeze
      EXTRACT_MAP = {:year=>"yy", :month=>"m", :day=>"d", :hour=>"hh", :minute=>"n", :second=>"s"}.freeze
      EXTRACT_MAP.each_value(&:freeze)
      LIMIT_ALL = Object.new.freeze

      Dataset.def_sql_method(self, :delete, %w'with delete limit from output from2 where')
      Dataset.def_sql_method(self, :insert, %w'with insert into columns output values')
      Dataset.def_sql_method(self, :update, [['if is_2005_or_later?', %w'with update limit table set output from where'], ['else', %w'update table set output from where']])

      # Use the database's mssql_unicode_strings setting if the dataset hasn't overridden it.
      def mssql_unicode_strings
        opts.has_key?(:mssql_unicode_strings) ? opts[:mssql_unicode_strings] : db.mssql_unicode_strings
      end

      # Return a cloned dataset with the mssql_unicode_strings option set.
      def with_mssql_unicode_strings(v)
        clone(:mssql_unicode_strings=>v)
      end

      def complex_expression_sql_append(sql, op, args)
        case op
        when :'||'
          super(sql, :+, args)
        when :LIKE, :"NOT LIKE"
          super(sql, op, args.map{|a| Sequel.lit(["(", " COLLATE Latin1_General_CS_AS)"], a)})
        when :ILIKE, :"NOT ILIKE"
          super(sql, (op == :ILIKE ? :LIKE : :"NOT LIKE"), args.map{|a| Sequel.lit(["(", " COLLATE Latin1_General_CI_AS)"], a)})
        when :<<, :>>
          complex_expression_emulate_append(sql, op, args)
        when :extract
          part = args[0]
          raise(Sequel::Error, "unsupported extract argument: #{part.inspect}") unless format = EXTRACT_MAP[part]
          if part == :second
            expr = args[1]
            sql << "CAST((datepart(" << format.to_s << ', '
            literal_append(sql, expr)
            sql << ') + datepart(ns, '
            literal_append(sql, expr)
            sql << ")/1000000000.0) AS double precision)"
          else
            sql << "datepart(" << format.to_s << ', '
            literal_append(sql, args[1])
            sql << ')'
          end
        else
          super
        end
      end
      
      # MSSQL doesn't support the SQL standard CURRENT_DATE or CURRENT_TIME
      def constant_sql_append(sql, constant)
        if c = CONSTANT_MAP[constant]
          sql << c
        else
          super
        end
      end
      
      # Uses CROSS APPLY to join the given table into the current dataset.
      def cross_apply(table)
        join_table(:cross_apply, table)
      end

      # Disable the use of INSERT OUTPUT
      def disable_insert_output
        clone(:disable_insert_output=>true)
      end

      # MSSQL treats [] as a metacharacter in LIKE expresions.
      def escape_like(string)
        string.gsub(/[\\%_\[\]]/){|m| "\\#{m}"}
      end
   
      # MSSQL uses the CONTAINS keyword for full text search
      def full_text_search(cols, terms, opts = OPTS)
        terms = "\"#{terms.join('" OR "')}\"" if terms.is_a?(Array)
        where(Sequel.lit("CONTAINS (?, ?)", cols, terms))
      end

      # Insert a record, returning the record inserted, using OUTPUT.  Always returns nil without
      # running an INSERT statement if disable_insert_output is used.  If the query runs
      # but returns no values, returns false.
      def insert_select(*values)
        return unless supports_insert_select?
        with_sql_first(insert_select_sql(*values)) || false
      end

      # Add OUTPUT clause unless there is already an existing output clause, then return
      # the SQL to insert.
      def insert_select_sql(*values)
        ds = (opts[:output] || opts[:returning]) ? self : output(nil, [SQL::ColumnAll.new(:inserted)])
        ds.insert_sql(*values)
      end

      # Specify a table for a SELECT ... INTO query.
      def into(table)
        clone(:into => table)
      end

      # Allows you to do a dirty read of uncommitted data using WITH (NOLOCK).
      def nolock
        lock_style(:dirty)
      end

      # Uses OUTER APPLY to join the given table into the current dataset.
      def outer_apply(table)
        join_table(:outer_apply, table)
      end

      # Include an OUTPUT clause in the eventual INSERT, UPDATE, or DELETE query.
      #
      # The first argument is the table to output into, and the second argument
      # is either an Array of column values to select, or a Hash which maps output
      # column names to selected values, in the style of #insert or #update.
      #
      # Output into a returned result set is not currently supported.
      #
      # Examples:
      #
      #   dataset.output(:output_table, [Sequel[:deleted][:id], Sequel[:deleted][:name]])
      #   dataset.output(:output_table, id: Sequel[:inserted][:id], name: Sequel[:inserted][:name])
      def output(into, values)
        raise(Error, "SQL Server versions 2000 and earlier do not support the OUTPUT clause") unless supports_output_clause?
        output = {}
        case values
        when Hash
          output[:column_list], output[:select_list] = values.keys, values.values
        when Array
          output[:select_list] = values
        end
        output[:into] = into
        clone(:output => output)
      end

      # MSSQL uses [] to quote identifiers.
      def quoted_identifier_append(sql, name)
        sql << '[' << name.to_s.gsub(/\]/, ']]') << ']'
      end

      # Emulate RETURNING using the output clause.  This only handles values that are simple column references.
      def returning(*values)
        values = values.map do |v|
          unless r = unqualified_column_for(v)
            raise(Error, "cannot emulate RETURNING via OUTPUT for value: #{v.inspect}")
          end
          r
        end
        clone(:returning=>values)
      end

      # On MSSQL 2012+ add a default order to the current dataset if an offset is used.
      # The default offset emulation using a subquery would be used in the unordered
      # case by default, and that also adds a default order, so it's better to just
      # avoid the subquery.
      def select_sql
        if @opts[:offset] && !@opts[:order] && is_2012_or_later?
          order(1).select_sql
        else
          super
        end
      end

      # The version of the database server.
      def server_version
        db.server_version(@opts[:server])
      end

      def supports_cte?(type=:select)
        is_2005_or_later?
      end

      # MSSQL 2005+ supports GROUP BY CUBE.
      def supports_group_cube?
        is_2005_or_later?
      end

      # MSSQL 2005+ supports GROUP BY ROLLUP
      def supports_group_rollup?
        is_2005_or_later?
      end

      # MSSQL 2008+ supports GROUPING SETS
      def supports_grouping_sets?
        is_2008_or_later?
      end

      # MSSQL supports insert_select via the OUTPUT clause.
      def supports_insert_select?
        supports_output_clause? && !opts[:disable_insert_output]
      end

      # MSSQL 2005+ supports INTERSECT and EXCEPT
      def supports_intersect_except?
        is_2005_or_later?
      end
      
      # MSSQL does not support IS TRUE
      def supports_is_true?
        false
      end
      
      # MSSQL doesn't support JOIN USING
      def supports_join_using?
        false
      end

      # MSSQL 2005+ supports modifying joined datasets
      def supports_modifying_joins?
        is_2005_or_later?
      end

      # MSSQL does not support multiple columns for the IN/NOT IN operators
      def supports_multiple_column_in?
        false
      end
      
      # MSSQL supports NOWAIT.
      def supports_nowait?
        true
      end

      # MSSQL 2012+ supports offsets in correlated subqueries.
      def supports_offsets_in_correlated_subqueries?
        is_2012_or_later?
      end

      # MSSQL 2005+ supports the OUTPUT clause.
      def supports_output_clause?
        is_2005_or_later?
      end

      # MSSQL 2005+ can emulate RETURNING via the OUTPUT clause.
      def supports_returning?(type)
        supports_insert_select?
      end

      # MSSQL uses READPAST to skip locked rows.
      def supports_skip_locked?
        true
      end

      # MSSQL 2005+ supports window functions
      def supports_window_functions?
        true
      end

      # MSSQL cannot use WHERE 1.
      def supports_where_true?
        false
      end
      
      protected
      
      # If returned primary keys are requested, use OUTPUT unless already set on the
      # dataset.  If OUTPUT is already set, use existing returning values.  If OUTPUT
      # is only set to return a single columns, return an array of just that column.
      # Otherwise, return an array of hashes.
      def _import(columns, values, opts=OPTS)
        if opts[:return] == :primary_key && !@opts[:output]
          output(nil, [SQL::QualifiedIdentifier.new(:inserted, first_primary_key)])._import(columns, values, opts)
        elsif @opts[:output]
          statements = multi_insert_sql(columns, values)
          ds = naked
          @db.transaction(opts.merge(:server=>@opts[:server])) do
            statements.map{|st| ds.with_sql(st)}
          end.first.map{|v| v.length == 1 ? v.values.first : v}
        else
          super
        end
      end

      # MSSQL does not allow ordering in sub-clauses unless TOP (limit) is specified
      def aggregate_dataset
        (options_overlap(Sequel::Dataset::COUNT_FROM_SELF_OPTS) && !options_overlap([:limit])) ? unordered.from_self : super
      end

      # If the dataset using a order without a limit or offset or custom SQL, 
      # remove the order.  Compounds on Microsoft SQL Server have undefined
      # order unless the result is specifically ordered.  Applying the current
      # order before the compound doesn't work in all cases, such as when
      # qualified identifiers are used.  If you want to ensure a order
      # for a compound dataset, apply the order after all compounds have been
      # added.
      def compound_from_self
        if @opts[:offset] && !@opts[:limit] && !is_2012_or_later?
          clone(:limit=>LIMIT_ALL).from_self
        elsif @opts[:order]  && !(@opts[:sql] || @opts[:limit] || @opts[:offset])
          unordered
        else
          super
        end
      end

      private

      # Allow update and delete for unordered, limited datasets only.
      def check_not_limited!(type)
        return if @opts[:skip_limit_check] && type != :truncate
        raise Sequel::InvalidOperation, "Dataset##{type} not suppored on ordered, limited datasets" if opts[:order] && opts[:limit]
        super if type == :truncate || @opts[:offset]
      end

      # Whether we are using SQL Server 2005 or later.
      def is_2005_or_later?
        server_version >= 9000000
      end

      # Whether we are using SQL Server 2008 or later.
      def is_2008_or_later?
        server_version >= 10000000
      end

      # Whether we are using SQL Server 2012 or later.
      def is_2012_or_later?
        server_version >= 11000000
      end

      # Use strict ISO-8601 format with T between date and time,
      # since that is the format that is multilanguage and not
      # DATEFORMAT dependent.
      def default_timestamp_format
        "'%Y-%m-%dT%H:%M:%S%N%z'"
      end

      # Only include the primary table in the main delete clause
      def delete_from_sql(sql)
        sql << ' FROM '
        source_list_append(sql, @opts[:from][0..0])
      end

      # MSSQL supports FROM clauses in DELETE and UPDATE statements.
      def delete_from2_sql(sql)
        if joined_dataset?
          select_from_sql(sql)
          select_join_sql(sql)
        end
      end
      alias update_from_sql delete_from2_sql

      def delete_output_sql(sql)
        output_sql(sql, :DELETED)
      end

      # There is no function on Microsoft SQL Server that does character length
      # and respects trailing spaces (datalength respects trailing spaces, but
      # counts bytes instead of characters).  Use a hack to work around the
      # trailing spaces issue.
      def emulate_function?(name)
        name == :char_length || name == :trim
      end

      def emulate_function_sql_append(sql, f)
        case f.name
        when :char_length
          literal_append(sql, SQL::Function.new(:len, Sequel.join([f.args.first, 'x'])) - 1)
        when :trim
          literal_append(sql, SQL::Function.new(:ltrim, SQL::Function.new(:rtrim, f.args.first)))
        end
      end
      
      # Microsoft SQL Server 2012+ has native support for offsets, but only for ordered datasets.
      def emulate_offset_with_row_number?
        super && !(is_2012_or_later? && @opts[:order])
      end
      
      # Return the first primary key for the current table.  If this table has
      # multiple primary keys, this will only return one of them.  Used by #_import.
      def first_primary_key
        @db.schema(self).map{|k, v| k if v[:primary_key] == true}.compact.first
      end

      def insert_output_sql(sql)
        output_sql(sql, :INSERTED)
      end
      alias update_output_sql insert_output_sql

      # Handle CROSS APPLY and OUTER APPLY JOIN types
      def join_type_sql(join_type)
        case join_type
        when :cross_apply
          'CROSS APPLY'
        when :outer_apply
          'OUTER APPLY'
        else
          super
        end
      end

      # MSSQL uses a literal hexidecimal number for blob strings
      def literal_blob_append(sql, v)
        sql << '0x' << v.unpack("H*").first
      end
      
      # Use YYYYmmdd format, since that's the only format that is
      # multilanguage and not DATEFORMAT dependent.
      def literal_date(v)
        v.strftime("'%Y%m%d'")
      end

      # Use 0 for false on MSSQL
      def literal_false
        '0'
      end

      # Optionally use unicode string syntax for all strings. Don't double
      # backslashes.
      def literal_string_append(sql, v)
        sql << (mssql_unicode_strings ? "N'" : "'")
        sql << v.gsub("'", "''").gsub(/\\((?:\r\n)|\n)/, '\\\\\\\\\\1\\1') << "'"
      end
      
      # Use 1 for true on MSSQL
      def literal_true
        '1'
      end
      
      # MSSQL 2008+ supports multiple rows in the VALUES clause, older versions
      # can use UNION.
      def multi_insert_sql_strategy
        is_2008_or_later? ? :values : :union
      end

      def non_sql_option?(key)
        super || key == :disable_insert_output || key == :mssql_unicode_strings
      end

      def select_into_sql(sql)
        if i = @opts[:into]
          sql << " INTO "
          identifier_append(sql, i)
        end
      end

      # MSSQL 2000 uses TOP N for limit.  For MSSQL 2005+ TOP (N) is used
      # to allow the limit to be a bound variable.
      def select_limit_sql(sql)
        if l = @opts[:limit]
          return if is_2012_or_later? && @opts[:order] && @opts[:offset]
          shared_limit_sql(sql, l)
        end
      end

      def shared_limit_sql(sql, l)
        if is_2005_or_later?
          if l == LIMIT_ALL
            sql << " TOP (100) PERCENT"
          else
            sql << " TOP ("
            literal_append(sql, l)
            sql << ')'
          end
        else
          sql << " TOP "
          literal_append(sql, l)
        end
      end

      def update_limit_sql(sql)
        if l = @opts[:limit]
          shared_limit_sql(sql, l)
        end
      end
      alias delete_limit_sql update_limit_sql

      # Handle dirty, skip locked, and for update locking
      def select_lock_sql(sql)
        lock = @opts[:lock]
        skip_locked = @opts[:skip_locked]
        nowait = @opts[:nowait]
        for_update = lock == :update
        dirty = lock == :dirty
        lock_hint = for_update || dirty

        if lock_hint || skip_locked
          sql << " WITH ("

          if lock_hint
            sql << (for_update ? 'UPDLOCK' : 'NOLOCK')
          end

          if skip_locked || nowait
            sql << ', ' if lock_hint
            sql << (skip_locked ? "READPAST" : "NOWAIT")
          end

          sql << ')'
        else
          super
        end
      end

      # On 2012+ when there is an order with an offset, append the offset (and possible
      # limit) at the end of the order clause.
      def select_order_sql(sql)
        super
        if is_2012_or_later? && @opts[:order]
          if o = @opts[:offset]
            sql << " OFFSET "
            literal_append(sql, o)
            sql << " ROWS"

            if l = @opts[:limit]
              sql << " FETCH NEXT "
              literal_append(sql, l)
              sql << " ROWS ONLY"
            end
          end
        end
      end

      def output_sql(sql, type)
        return unless supports_output_clause?
        if output = @opts[:output]
          output_list_sql(sql, output)
        elsif values = @opts[:returning]
          output_returning_sql(sql, type, values)
        end
      end

      def output_list_sql(sql, output)
        sql << " OUTPUT "
        column_list_append(sql, output[:select_list])
        if into = output[:into]
          sql << " INTO "
          identifier_append(sql, into)
          if column_list = output[:column_list]
            sql << ' ('
            source_list_append(sql, column_list)
            sql << ')'
          end
        end
      end

      def output_returning_sql(sql, type, values)
        sql << " OUTPUT "
        if values.empty?
          literal_append(sql, SQL::ColumnAll.new(type))
        else
          values = values.map do |v|
            case v
            when SQL::AliasedExpression
              Sequel.qualify(type, v.expression).as(v.alias)
            else
              Sequel.qualify(type, v)
            end
          end
          column_list_append(sql, values)
        end
      end

      # MSSQL does not natively support NULLS FIRST/LAST.
      def requires_emulating_nulls_first?
        true
      end

      # MSSQL supports 100-nsec precision for time columns, but ruby by
      # default only supports usec precision.
      def sqltime_precision
        6
      end

      # MSSQL supports millisecond timestamp precision for datetime columns.
      # 100-nsec precision is supported for datetime2 columns, but Sequel does
      # not know what the column type is when formatting values.
      def timestamp_precision
        3
      end

      # Only include the primary table in the main update clause
      def update_table_sql(sql)
        sql << ' '
        source_list_append(sql, @opts[:from][0..0])
      end

      def uses_with_rollup?
        !is_2008_or_later?
      end
    end
  end
end
