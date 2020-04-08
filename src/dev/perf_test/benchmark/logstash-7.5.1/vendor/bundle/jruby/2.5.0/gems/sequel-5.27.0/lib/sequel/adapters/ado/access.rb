# frozen-string-literal: true

require_relative '../shared/access'
require_relative '../utils/split_alter_table'

module Sequel
  module ADO
    # Database and Dataset instance methods for Access specific
    # support via ADO.
    module Access
      class AdoSchema
        QUERY_TYPE = {
          :columns => 4,
          :indexes => 12,
          :tables  => 20,
          :views   => 23,
          :foreign_keys => 27
        }.freeze
        
        attr_reader :type, :criteria

        def initialize(type, crit)
          @type     = QUERY_TYPE[type]
          @criteria = Array(crit)
        end
        
        class Column
          DATA_TYPE = {
            2   => "SMALLINT",
            3   => "INTEGER",
            4   => "REAL",
            5   => "DOUBLE",
            6   => "MONEY",
            7   => "DATETIME",
            11  => "BIT",
            14  => "DECIMAL",
            16  => "TINYINT",
            17  => "BYTE",
            72  => "GUID",
            128 => "BINARY",
            130 => "TEXT",
            131 => "DECIMAL",
            201 => "TEXT",
            205 => "IMAGE"
          }.freeze
          DATA_TYPE.each_value(&:freeze)
          
          def initialize(row)
            @row = row
          end
          
          def [](col)
            @row[col]
          end
          
          def allow_null
            self["IS_NULLABLE"]
          end
          
          def default
            self["COLUMN_DEFAULT"]
          end
          
          def db_type
            t = DATA_TYPE[self["DATA_TYPE"]]
            if t == "DECIMAL" && precision
              t + "(#{precision.to_i},#{(scale || 0).to_i})"
            elsif t == "TEXT" && maximum_length && maximum_length > 0
              t + "(#{maximum_length.to_i})"
            else
              t
            end
          end
          
          def precision
            self["NUMERIC_PRECISION"]
          end
          
          def scale
            self["NUMERIC_SCALE"]
          end
          
          def maximum_length
            self["CHARACTER_MAXIMUM_LENGTH"]
          end
        end
      end      

      module DatabaseMethods
        include Sequel::Access::DatabaseMethods
        include Sequel::Database::SplitAlterTable
    
        # Remove cached schema after altering a table, since otherwise it can be cached
        # incorrectly in the rename column case.
        def alter_table(name, *)
          super
          remove_cached_schema(name)
          nil
        end

        # Access doesn't let you disconnect if inside a transaction, so
        # try rolling back an existing transaction first.
        def disconnect_connection(conn)
          conn.RollbackTrans rescue nil
          super
        end

        def execute_insert(sql, opts=OPTS)
          synchronize(opts[:server]) do |conn|
            begin
              log_connection_yield(sql, conn){conn.Execute(sql)}
              last_insert_sql = "SELECT @@IDENTITY"
              res = log_connection_yield(last_insert_sql, conn){conn.Execute(last_insert_sql)}
              res.GetRows.transpose.each{|r| return r.shift}
            rescue ::WIN32OLERuntimeError => e
              raise_error(e)
            end
          end
          nil
        end

        def tables(opts=OPTS)
          m = output_identifier_meth
          ado_schema_tables.map {|tbl| m.call(tbl['TABLE_NAME'])}
        end

        def views(opts=OPTS)
          m = output_identifier_meth
          ado_schema_views.map {|tbl| m.call(tbl['TABLE_NAME'])}
        end
        
        # OpenSchema returns compound indexes as multiple rows
        def indexes(table_name,opts=OPTS)
          m = output_identifier_meth
          idxs = ado_schema_indexes(table_name).inject({}) do |memo, idx|
            unless idx["PRIMARY_KEY"]
              index = memo[m.call(idx["INDEX_NAME"])] ||= {
                :columns=>[], :unique=>idx["UNIQUE"]
              }
              index[:columns] << m.call(idx["COLUMN_NAME"])
            end
            memo
          end
          idxs
        end

        # OpenSchema returns compound foreign key relationships as multiple rows
        def foreign_key_list(table, opts=OPTS)
          m = output_identifier_meth
          fks = ado_schema_foreign_keys(table).inject({}) do |memo, fk|
            name = m.call(fk['FK_NAME'])
            specs = memo[name] ||= {
              :columns => [],
              :table   => m.call(fk['PK_TABLE_NAME']),
              :key     => [],
              :deferrable => fk['DEFERRABILITY'],
              :name    => name,
              :on_delete => fk['DELETE_RULE'],
              :on_update => fk['UPDATE_RULE']
            }
            specs[:columns] << m.call(fk['FK_COLUMN_NAME'])
            specs[:key]     << m.call(fk['PK_COLUMN_NAME'])
            memo
          end
          fks.values
        end
                
        private

        # Emulate rename_column by adding the column, copying data from the old
        # column, and dropping the old column.
        def alter_table_sql(table, op)
          case op[:op]
          when :rename_column
            unless sch = op[:schema]
              raise(Error, "can't find existing schema entry for #{op[:name]}") unless sch = op[:schema] || schema(table).find{|c| c.first == op[:name]}
              sch = sch.last
            end
            [
              alter_table_sql(table, :op=>:add_column, :name=>op[:new_name], :default=>sch[:ruby_default], :type=>sch[:db_type], :null=>sch[:allow_null]),
              from(table).update_sql(op[:new_name]=>op[:name]),
              alter_table_sql(table, :op=>:drop_column, :name=>op[:name])
            ]
          when :set_column_null, :set_column_default
            raise(Error, "can't find existing schema entry for #{op[:name]}") unless sch = op[:schema] || schema(table).find{|c| c.first == op[:name]}
            sch = sch.last

            sch = if op[:op] == :set_column_null
              sch.merge(:allow_null=>op[:null])
            else
              sch.merge(:ruby_default=>op[:default])
            end

            [
              alter_table_sql(table, :op=>:rename_column, :name=>op[:name], :new_name=>:sequel_access_backup_column, :schema=>sch),
              alter_table_sql(table, :op=>:rename_column, :new_name=>op[:name], :name=>:sequel_access_backup_column, :schema=>sch)
            ]
          else
            super
          end
        end

        def begin_transaction(conn, opts=OPTS)
          log_connection_yield('Transaction.begin', conn){conn.BeginTrans}
        end
          
        def commit_transaction(conn, opts=OPTS)
          log_connection_yield('Transaction.commit', conn){conn.CommitTrans}
        end
          
        def rollback_transaction(conn, opts=OPTS)
          log_connection_yield('Transaction.rollback', conn){conn.RollbackTrans}
        end
          
        def schema_column_type(db_type)
          case db_type.downcase
          when 'bit'
            :boolean
          when 'byte', 'guid'
            :integer
          when 'image'
            :blob
          else
            super
          end
        end
        
        def schema_parse_table(table_name, opts)
          m = output_identifier_meth(opts[:dataset])
          m2 = input_identifier_meth(opts[:dataset])
          tn = m2.call(table_name.to_s)
          idxs = ado_schema_indexes(tn)
          ado_schema_columns(tn).map {|row|
            specs = { 
              :allow_null => row.allow_null,
              :db_type => row.db_type,
              :default => row.default,
              :primary_key => !!idxs.find {|idx| 
                                idx["COLUMN_NAME"] == row["COLUMN_NAME"] &&
                                idx["PRIMARY_KEY"]
                              },
              :type =>  if row.db_type =~ /decimal/i && row.scale == 0
                          :integer
                        else
                          schema_column_type(row.db_type)
                        end,
              :ado_type => row["DATA_TYPE"]
            }
            specs[:default] = nil if blank_object?(specs[:default])
            specs[:allow_null] = specs[:allow_null] && !specs[:primary_key]
            [ m.call(row["COLUMN_NAME"]), specs ]
          }
        end

        def ado_schema_tables
          rows=[]
          fetch_ado_schema(:tables, [nil,nil,nil,'TABLE']) do |row|
            rows << row
          end
          rows
        end

        def ado_schema_views
          rows=[]
          fetch_ado_schema(:views, [nil,nil,nil]) do |row|
            rows << row
          end
          rows
        end
        
        def ado_schema_indexes(table_name)
          rows=[]
          fetch_ado_schema(:indexes, [nil,nil,nil,nil,table_name.to_s]) do |row|
            rows << row
          end
          rows
        end
        
        def ado_schema_columns(table_name)
          rows=[]
          fetch_ado_schema(:columns, [nil,nil,table_name.to_s,nil]) do |row| 
            rows << AdoSchema::Column.new(row)
          end
          rows.sort!{|a,b| a["ORDINAL_POSITION"] <=> b["ORDINAL_POSITION"]}
        end
        
        def ado_schema_foreign_keys(table_name)
          rows=[]
          fetch_ado_schema(:foreign_keys, [nil,nil,nil,nil,nil,table_name.to_s]) do |row| 
            rows << row
          end
          rows.sort!{|a,b| a["ORDINAL"] <=> b["ORDINAL"]}
        end
        
        def fetch_ado_schema(type, criteria=[])
          execute_open_ado_schema(type, criteria) do |s|
            cols = []
            s.Fields.each{|f| cols << f.Name}
            s.GetRows.transpose.each do |r|
              row = {}
              cols.each{|c| row[c] = r.shift}
              yield row
            end unless s.eof
          end
        end
             
        # This is like execute() in that it yields an ADO RecordSet, except
        # instead of an SQL interface there's this OpenSchema call
        # cf. http://msdn.microsoft.com/en-us/library/ee275721(v=bts.10)
        def execute_open_ado_schema(type, criteria=[])
          ado_schema = AdoSchema.new(type, criteria)
          synchronize(opts[:server]) do |conn|
            begin
              r = log_connection_yield("OpenSchema #{type.inspect}, #{criteria.inspect}", conn) { 
                if ado_schema.criteria.empty?
                  conn.OpenSchema(ado_schema.type) 
                else
                  conn.OpenSchema(ado_schema.type, ado_schema.criteria) 
                end
              }
              yield(r) if block_given?
            rescue ::WIN32OLERuntimeError => e
              raise_error(e)
            end
          end
          nil
        end
      end
      
      class Dataset < ADO::Dataset
        include Sequel::Access::DatasetMethods
      end
    end
  end
end
