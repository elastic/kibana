# frozen-string-literal: true

module Sequel
  class Database
    # ---------------------
    # :section: 2 - Methods that modify the database schema
    # These methods execute code on the database that modifies the database's schema.
    # ---------------------

    # The order of column modifiers to use when defining a column.
    COLUMN_DEFINITION_ORDER = [:collate, :default, :null, :unique, :primary_key, :auto_increment, :references].freeze

    # The alter table operations that are combinable.
    COMBINABLE_ALTER_TABLE_OPS = [:add_column, :drop_column, :rename_column,
      :set_column_type, :set_column_default, :set_column_null,
      :add_constraint, :drop_constraint].freeze

    # Adds a column to the specified table. This method expects a column name,
    # a datatype and optionally a hash with additional constraints and options:
    #
    #   DB.add_column :items, :name, String, unique: true, null: false
    #   DB.add_column :items, :category, String, default: 'ruby'
    #
    # See <tt>alter_table</tt>.
    def add_column(table, *args)
      alter_table(table) {add_column(*args)}
    end
    
    # Adds an index to a table for the given columns:
    # 
    #   DB.add_index :posts, :title
    #   DB.add_index :posts, [:author, :title], unique: true
    #
    # Options:
    #
    # :ignore_errors :: Ignore any DatabaseErrors that are raised
    # :name :: Name to use for index instead of default
    #
    # See <tt>alter_table</tt>.
    def add_index(table, columns, options=OPTS)
      e = options[:ignore_errors]
      begin
        alter_table(table){add_index(columns, options)}
      rescue DatabaseError
        raise unless e
      end
      nil
    end
    
    # Alters the given table with the specified block. Example:
    #
    #   DB.alter_table :items do
    #     add_column :category, String, default: 'ruby'
    #     drop_column :category
    #     rename_column :cntr, :counter
    #     set_column_type :value, Float
    #     set_column_default :value, 4.2
    #     add_index [:group, :category]
    #     drop_index [:group, :category]
    #   end
    #
    # Note that +add_column+ accepts all the options available for column
    # definitions using <tt>create_table</tt>, and +add_index+ accepts all the options
    # available for index definition.
    #
    # See <tt>Schema::AlterTableGenerator</tt> and the {"Migrations and Schema Modification" guide}[rdoc-ref:doc/migration.rdoc].
    def alter_table(name, &block)
      generator = alter_table_generator(&block)
      remove_cached_schema(name)
      apply_alter_table_generator(name, generator)
      nil
    end

    # Return a new Schema::AlterTableGenerator instance with the receiver as
    # the database and the given block.
    def alter_table_generator(&block)
      alter_table_generator_class.new(self, &block)
    end

    # Create a join table using a hash of foreign keys to referenced
    # table names.  Example:
    #
    #   create_join_table(cat_id: :cats, dog_id: :dogs)
    #   # CREATE TABLE cats_dogs (
    #   #  cat_id integer NOT NULL REFERENCES cats,
    #   #  dog_id integer NOT NULL REFERENCES dogs,
    #   #  PRIMARY KEY (cat_id, dog_id)
    #   # )
    #   # CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs(dog_id, cat_id)
    #
    # The primary key and index are used so that almost all operations
    # on the table can benefit from one of the two indexes, and the primary
    # key ensures that entries in the table are unique, which is the typical
    # desire for a join table.
    #
    # The default table name this will create is the sorted version of the two
    # hash values, joined by an underscore.  So the following two method calls
    # create the same table:
    #
    #   create_join_table(cat_id: :cats, dog_id: :dogs) # cats_dogs
    #   create_join_table(dog_id: :dogs, cat_id: :cats) # cats_dogs
    #
    # You can provide column options by making the values in the hash
    # be option hashes, so long as the option hashes have a :table
    # entry giving the table referenced:
    #
    #   create_join_table(cat_id: {table: :cats, type: :Bignum}, dog_id: :dogs)
    #   
    # You can provide a second argument which is a table options hash:
    #
    #   create_join_table({cat_id: :cats, dog_id: :dogs}, temp: true)
    #
    # Some table options are handled specially:
    #
    # :index_options :: The options to pass to the index
    # :name :: The name of the table to create
    # :no_index :: Set to true not to create the second index.
    # :no_primary_key :: Set to true to not create the primary key.
    def create_join_table(hash, options=OPTS)
      keys = hash.keys.sort
      create_table(join_table_name(hash, options), options) do
        keys.each do |key|
          v = hash[key]
          unless v.is_a?(Hash)
            v = {:table=>v}
          end
          v[:null] = false unless v.has_key?(:null)
          foreign_key(key, v)
        end
        primary_key(keys) unless options[:no_primary_key]
        index(keys.reverse, options[:index_options] || OPTS) unless options[:no_index]
      end
      nil
    end

    # Forcibly create a join table, attempting to drop it if it already exists, then creating it.
    def create_join_table!(hash, options=OPTS)
      drop_table?(join_table_name(hash, options))
      create_join_table(hash, options)
    end
    
    # Creates the join table unless it already exists.
    def create_join_table?(hash, options=OPTS)
      if supports_create_table_if_not_exists? && options[:no_index]
        create_join_table(hash, options.merge(:if_not_exists=>true))
      elsif !table_exists?(join_table_name(hash, options))
        create_join_table(hash, options)
      end
    end

    # Creates a table with the columns given in the provided block:
    #
    #   DB.create_table :posts do
    #     primary_key :id
    #     column :title, String
    #     String :content
    #     index :title
    #   end
    #
    # General options:
    # :as :: Create the table using the value, which should be either a
    #        dataset or a literal SQL string.  If this option is used,
    #        a block should not be given to the method.
    # :ignore_index_errors :: Ignore any errors when creating indexes.
    # :temp :: Create the table as a temporary table.
    #
    # MySQL specific options:
    # :charset :: The character set to use for the table.
    # :collate :: The collation to use for the table.
    # :engine :: The table engine to use for the table.
    #
    # PostgreSQL specific options:
    # :on_commit :: Either :preserve_rows (default), :drop or :delete_rows. Should
    #               only be specified when creating a temporary table.
    # :foreign :: Create a foreign table.  The value should be the name of the
    #             foreign server that was specified in CREATE SERVER.
    # :inherits :: Inherit from a different table.  An array can be
    #              specified to inherit from multiple tables.
    # :unlogged :: Create the table as an unlogged table.
    # :options :: The OPTIONS clause to use for foreign tables.  Should be a hash
    #             where keys are option names and values are option values.  Note
    #             that option names are unquoted, so you should not use untrusted
    #             keys.
    # :tablespace :: The tablespace to use for the table.
    #
    # See <tt>Schema::CreateTableGenerator</tt> and the {"Schema Modification" guide}[rdoc-ref:doc/schema_modification.rdoc].
    def create_table(name, options=OPTS, &block)
      remove_cached_schema(name)
      if sql = options[:as]
        raise(Error, "can't provide both :as option and block to create_table") if block
        create_table_as(name, sql, options)
      else
        generator = options[:generator] || create_table_generator(&block)
        create_table_from_generator(name, generator, options)
        create_table_indexes_from_generator(name, generator, options)
      end
      nil
    end

    # Forcibly create a table, attempting to drop it if it already exists, then creating it.
    # 
    #   DB.create_table!(:a){Integer :a} 
    #   # SELECT NULL FROM a LIMIT 1 -- check existence
    #   # DROP TABLE a -- drop table if already exists
    #   # CREATE TABLE a (a integer)
    def create_table!(name, options=OPTS, &block)
      drop_table?(name)
      create_table(name, options, &block)
    end
    
    # Creates the table unless the table already exists.
    # 
    #   DB.create_table?(:a){Integer :a} 
    #   # SELECT NULL FROM a LIMIT 1 -- check existence
    #   # CREATE TABLE a (a integer) -- if it doesn't already exist
    def create_table?(name, options=OPTS, &block)
      options = options.dup
      generator = options[:generator] ||= create_table_generator(&block)
      if generator.indexes.empty? && supports_create_table_if_not_exists?
        create_table(name, options.merge!(:if_not_exists=>true))
      elsif !table_exists?(name)
        create_table(name, options)
      end
    end

    # Return a new Schema::CreateTableGenerator instance with the receiver as
    # the database and the given block.
    def create_table_generator(&block)
      create_table_generator_class.new(self, &block)
    end
    
    # Creates a view, replacing a view with the same name if one already exists.
    #
    #   DB.create_or_replace_view(:some_items, "SELECT * FROM items WHERE price < 100")
    #   DB.create_or_replace_view(:some_items, DB[:items].where(category: 'ruby'))
    #
    # For databases where replacing a view is not natively supported, support
    # is emulated by dropping a view with the same name before creating the view.
    def create_or_replace_view(name, source, options = OPTS)
      if supports_create_or_replace_view?
        options = options.merge(:replace=>true)
      else
        drop_view(name) rescue nil
      end

      create_view(name, source, options)
      nil
    end
    
    # Creates a view based on a dataset or an SQL string:
    #
    #   DB.create_view(:cheap_items, "SELECT * FROM items WHERE price < 100")
    #   # CREATE VIEW cheap_items AS
    #   # SELECT * FROM items WHERE price < 100
    #
    #   DB.create_view(:ruby_items, DB[:items].where(category: 'ruby'))
    #   # CREATE VIEW ruby_items AS
    #   # SELECT * FROM items WHERE (category = 'ruby')
    #
    #   DB.create_view(:checked_items, DB[:items].where(:foo), check: true)
    #   # CREATE VIEW checked_items AS
    #   # SELECT * FROM items WHERE foo
    #   # WITH CHECK OPTION
    #
    # Options:
    # :columns :: The column names to use for the view.  If not given,
    #             automatically determined based on the input dataset.
    # :check :: Adds a WITH CHECK OPTION clause, so that attempting to modify 
    #           rows in the underlying table that would not be returned by the
    #           view is not allowed.  This can be set to :local to use WITH
    #           LOCAL CHECK OPTION.
    #
    # PostgreSQL/SQLite specific option:
    # :temp :: Create a temporary view, automatically dropped on disconnect.
    #
    # PostgreSQL specific options:
    # :materialized :: Creates a materialized view, similar to a regular view,
    #                  but backed by a physical table.
    # :recursive :: Creates a recursive view.  As columns must be specified for
    #               recursive views, you can also set them as the value of this
    #               option.  Since a recursive view requires a union that isn't
    #               in a subquery, if you are providing a Dataset as the source
    #               argument, if should probably call the union method with the
    #               all: true and from_self: false options.
    # :tablespace :: The tablespace to use for materialized views.
    def create_view(name, source, options = OPTS)
      execute_ddl(create_view_sql(name, source, options))
      remove_cached_schema(name)
      nil
    end
    
    # Removes a column from the specified table:
    #
    #   DB.drop_column :items, :category
    #
    # See <tt>alter_table</tt>.
    def drop_column(table, *args)
      alter_table(table) {drop_column(*args)}
    end
    
    # Removes an index for the given table and column(s):
    #
    #   DB.drop_index :posts, :title
    #   DB.drop_index :posts, [:author, :title]
    #
    # See <tt>alter_table</tt>.
    def drop_index(table, columns, options=OPTS)
      alter_table(table){drop_index(columns, options)}
    end

    # Drop the join table that would have been created with the
    # same arguments to create_join_table:
    #
    #   drop_join_table(cat_id: :cats, dog_id: :dogs)
    #   # DROP TABLE cats_dogs
    def drop_join_table(hash, options=OPTS)
      drop_table(join_table_name(hash, options), options)
    end
    
    # Drops one or more tables corresponding to the given names:
    #
    #   DB.drop_table(:posts) # DROP TABLE posts
    #   DB.drop_table(:posts, :comments)
    #   DB.drop_table(:posts, :comments, cascade: true)
    def drop_table(*names)
      options = names.last.is_a?(Hash) ? names.pop : OPTS 
      names.each do |n|
        execute_ddl(drop_table_sql(n, options))
        remove_cached_schema(n)
      end
      nil
    end
    
    # Drops the table if it already exists.  If it doesn't exist,
    # does nothing.
    # 
    #   DB.drop_table?(:a)
    #   # SELECT NULL FROM a LIMIT 1 -- check existence
    #   # DROP TABLE a -- if it already exists
    def drop_table?(*names)
      options = names.last.is_a?(Hash) ? names.pop : OPTS
      if supports_drop_table_if_exists?
        options = options.merge(:if_exists=>true)
        names.each do |name|
          drop_table(name, options)
        end
      else
        names.each do |name|
          drop_table(name, options) if table_exists?(name)
        end
      end
      nil
    end
    
    # Drops one or more views corresponding to the given names:
    #
    #   DB.drop_view(:cheap_items)
    #   DB.drop_view(:cheap_items, :pricey_items)
    #   DB.drop_view(:cheap_items, :pricey_items, cascade: true)
    #   DB.drop_view(:cheap_items, :pricey_items, if_exists: true)
    #
    # Options:
    # :cascade :: Also drop objects depending on this view.
    # :if_exists :: Do not raise an error if the view does not exist.
    #
    # PostgreSQL specific options:
    # :materialized :: Drop a materialized view.
    def drop_view(*names)
      options = names.last.is_a?(Hash) ? names.pop : OPTS
      names.each do |n|
        execute_ddl(drop_view_sql(n, options))
        remove_cached_schema(n)
      end
      nil
    end

    # Renames a table:
    #
    #   DB.tables #=> [:items]
    #   DB.rename_table :items, :old_items
    #   DB.tables #=> [:old_items]
    def rename_table(name, new_name)
      execute_ddl(rename_table_sql(name, new_name))
      remove_cached_schema(name)
      nil
    end
    
    # Renames a column in the specified table. This method expects the current
    # column name and the new column name:
    #
    #   DB.rename_column :items, :cntr, :counter
    #
    # See <tt>alter_table</tt>.
    def rename_column(table, *args)
      alter_table(table) {rename_column(*args)}
    end
    
    # Sets the default value for the given column in the given table:
    #
    #   DB.set_column_default :items, :category, 'perl!'
    #
    # See <tt>alter_table</tt>.
    def set_column_default(table, *args)
      alter_table(table) {set_column_default(*args)}
    end
    
    # Set the data type for the given column in the given table:
    #
    #   DB.set_column_type :items, :price, :float
    #
    # See <tt>alter_table</tt>.
    def set_column_type(table, *args)
      alter_table(table) {set_column_type(*args)}
    end

    private

    # Apply the changes in the given alter table ops to the table given by name.
    def apply_alter_table(name, ops)
      alter_table_sql_list(name, ops).each{|sql| execute_ddl(sql)}
    end
    
    # Apply the operations in the given generator to the table given by name.
    def apply_alter_table_generator(name, generator)
      ops = generator.operations

      unless can_add_primary_key_constraint_on_nullable_columns?
        if add_pk = ops.find{|op| op[:op] == :add_constraint && op[:type] == :primary_key}
          ops = add_pk[:columns].map{|column| {:op => :set_column_null, :name => column, :null => false}} + ops
        end
      end

      apply_alter_table(name, ops)
    end

    # The class used for alter_table generators.
    def alter_table_generator_class
      Schema::AlterTableGenerator
    end
    
    # SQL fragment for given alter table operation.
    def alter_table_op_sql(table, op)
      meth = "alter_table_#{op[:op]}_sql"
      if respond_to?(meth, true)
        # Allow calling private methods as alter table op sql methods are private
        send(meth, table, op)
      else
        raise Error, "Unsupported ALTER TABLE operation: #{op[:op]}"
      end
    end

    def alter_table_add_column_sql(table, op)
      "ADD COLUMN #{column_definition_sql(op)}"
    end

    def alter_table_drop_column_sql(table, op)
      "DROP COLUMN #{quote_identifier(op[:name])}#{' CASCADE' if op[:cascade]}"
    end

    def alter_table_rename_column_sql(table, op)
      "RENAME COLUMN #{quote_identifier(op[:name])} TO #{quote_identifier(op[:new_name])}"
    end

    def alter_table_set_column_type_sql(table, op)
      "ALTER COLUMN #{quote_identifier(op[:name])} TYPE #{type_literal(op)}"
    end

    def alter_table_set_column_default_sql(table, op)
      "ALTER COLUMN #{quote_identifier(op[:name])} SET DEFAULT #{literal(op[:default])}"
    end

    def alter_table_set_column_null_sql(table, op)
      "ALTER COLUMN #{quote_identifier(op[:name])} #{op[:null] ? 'DROP' : 'SET'} NOT NULL"
    end

    def alter_table_add_constraint_sql(table, op)
      "ADD #{constraint_definition_sql(op)}"
    end

    def alter_table_drop_constraint_sql(table, op)
      quoted_name = quote_identifier(op[:name]) if op[:name]
      if op[:type] == :foreign_key
        quoted_name ||= quote_identifier(foreign_key_name(table, op[:columns]))
      end
      "DROP CONSTRAINT #{quoted_name}#{' CASCADE' if op[:cascade]}"
    end

    # The SQL to execute to modify the table.  op
    # should be one of the operations returned by the AlterTableGenerator.
    def alter_table_sql(table, op)
      case op[:op]
      when :add_index
        index_definition_sql(table, op)
      when :drop_index
        drop_index_sql(table, op)
      else
        "ALTER TABLE #{quote_schema_table(table)} #{alter_table_op_sql(table, op)}"
      end
    end

    # Array of SQL statements used to modify the table,
    # corresponding to changes specified by the operations.
    def alter_table_sql_list(table, operations)
      if supports_combining_alter_table_ops?
        grouped_ops = []
        last_combinable = false
        operations.each do |op|
          if combinable_alter_table_op?(op)
            if sql = alter_table_op_sql(table, op)
              grouped_ops << [] unless last_combinable
              grouped_ops.last << sql
              last_combinable = true
            end
          elsif sql = alter_table_sql(table, op)
            Array(sql).each{|s| grouped_ops << s}
            last_combinable = false
          end
        end
        grouped_ops.map do |gop|
          if gop.is_a?(Array)
            "ALTER TABLE #{quote_schema_table(table)} #{gop.join(', ')}"
          else
            gop
          end
        end
      else
        operations.map{|op| alter_table_sql(table, op)}.flatten.compact
      end
    end
    
    # The SQL string specify the autoincrement property, generally used by
    # primary keys.
    def auto_increment_sql
      'AUTOINCREMENT'
    end
    
    # The order of the column definition, as an array of symbols.
    def column_definition_order
      COLUMN_DEFINITION_ORDER
    end

    # SQL fragment containing the column creation SQL for the given column.
    def column_definition_sql(column)
      sql = String.new
      sql << "#{quote_identifier(column[:name])} #{type_literal(column)}"
      column_definition_order.each{|m| send(:"column_definition_#{m}_sql", sql, column)}
      sql
    end

    # Add auto increment SQL fragment to column creation SQL.
    def column_definition_auto_increment_sql(sql, column)
      sql << " #{auto_increment_sql}" if column[:auto_increment]
    end

    # Add collate SQL fragment to column creation SQL.
    def column_definition_collate_sql(sql, column)
      if collate = column[:collate]
        sql << " COLLATE #{collate}"
      end
    end

    # Add default SQL fragment to column creation SQL.
    def column_definition_default_sql(sql, column)
      sql << " DEFAULT #{literal(column[:default])}" if column.include?(:default)
    end
    
    # Add null/not null SQL fragment to column creation SQL.
    def column_definition_null_sql(sql, column)
      null = column.fetch(:null, column[:allow_null])
      if null.nil? && !can_add_primary_key_constraint_on_nullable_columns? && column[:primary_key]
        null = false
      end

      case null
      when false
        sql << ' NOT NULL'
      when true
        sql << ' NULL'
      end
    end
    
    # Add primary key SQL fragment to column creation SQL.
    def column_definition_primary_key_sql(sql, column)
      if column[:primary_key]
        if name = column[:primary_key_constraint_name]
          sql << " CONSTRAINT #{quote_identifier(name)}"
        end
        sql << ' PRIMARY KEY'
        constraint_deferrable_sql_append(sql, column[:primary_key_deferrable])
      end
    end
    
    # Add foreign key reference SQL fragment to column creation SQL.
    def column_definition_references_sql(sql, column)
      if column[:table]
        if name = column[:foreign_key_constraint_name]
         sql << " CONSTRAINT #{quote_identifier(name)}"
        end
        sql << column_references_column_constraint_sql(column)
      end
    end
    
    # Add unique constraint SQL fragment to column creation SQL.
    def column_definition_unique_sql(sql, column)
      if column[:unique]
        if name = column[:unique_constraint_name]
          sql << " CONSTRAINT #{quote_identifier(name)}"
        end
        sql << ' UNIQUE'
        constraint_deferrable_sql_append(sql, column[:unique_deferrable])
      end
    end
    
    # SQL for all given columns, used inside a CREATE TABLE block.
    def column_list_sql(generator)
      (generator.columns.map{|c| column_definition_sql(c)} + generator.constraints.map{|c| constraint_definition_sql(c)}).join(', ')
    end

    # SQL fragment for column foreign key references (column constraints)
    def column_references_column_constraint_sql(column)
      column_references_sql(column)
    end

    # SQL fragment for column foreign key references
    def column_references_sql(column)
      sql = String.new
      sql << " REFERENCES #{quote_schema_table(column[:table])}"
      sql << "(#{Array(column[:key]).map{|x| quote_identifier(x)}.join(', ')})" if column[:key]
      sql << " ON DELETE #{on_delete_clause(column[:on_delete])}" if column[:on_delete]
      sql << " ON UPDATE #{on_update_clause(column[:on_update])}" if column[:on_update]
      constraint_deferrable_sql_append(sql, column[:deferrable])
      sql
    end
  
    # SQL fragment for table foreign key references (table constraints)
    def column_references_table_constraint_sql(constraint)
      "FOREIGN KEY #{literal(constraint[:columns])}#{column_references_sql(constraint)}"
    end

    # Whether the given alter table operation is combinable.
    def combinable_alter_table_op?(op)
      COMBINABLE_ALTER_TABLE_OPS.include?(op[:op])
    end

    # SQL fragment specifying a constraint on a table.
    def constraint_definition_sql(constraint)
      sql = String.new
      sql << "CONSTRAINT #{quote_identifier(constraint[:name])} " if constraint[:name] 
      case constraint[:type]
      when :check
        check = constraint[:check]
        check = check.first if check.is_a?(Array) && check.length == 1
        check = filter_expr(check)
        check = "(#{check})" unless check[0..0] == '(' && check[-1..-1] == ')'
        sql << "CHECK #{check}"
      when :primary_key
        sql << "PRIMARY KEY #{literal(constraint[:columns])}"
      when :foreign_key
        sql << column_references_table_constraint_sql(constraint.merge(:deferrable=>nil))
      when :unique
        sql << "UNIQUE #{literal(constraint[:columns])}"
      else
        raise Error, "Invalid constraint type #{constraint[:type]}, should be :check, :primary_key, :foreign_key, or :unique"
      end
      constraint_deferrable_sql_append(sql, constraint[:deferrable])
      sql
    end

    # SQL fragment specifying the deferrable constraint attributes.
    def constraint_deferrable_sql_append(sql, defer)
      case defer
      when nil
      when false
        sql << ' NOT DEFERRABLE'
      when :immediate
        sql << ' DEFERRABLE INITIALLY IMMEDIATE'
      else
        sql << ' DEFERRABLE INITIALLY DEFERRED'
      end
    end

    # Execute the create table statements using the generator.
    def create_table_from_generator(name, generator, options)
      execute_ddl(create_table_sql(name, generator, options))
    end

    # The class used for create_table generators.
    def create_table_generator_class
      Schema::CreateTableGenerator
    end
    
    # Execute the create index statements using the generator.
    def create_table_indexes_from_generator(name, generator, options)
      e = options[:ignore_index_errors] || options[:if_not_exists]
      generator.indexes.each do |index|
        begin
          pr = proc{index_sql_list(name, [index]).each{|sql| execute_ddl(sql)}}
          supports_transactional_ddl? ? transaction(:savepoint=>:only, &pr) : pr.call
        rescue Error
          raise unless e
        end
      end
    end

    # SQL statement for creating a table with the given name, columns, and options
    def create_table_sql(name, generator, options)
      unless supports_named_column_constraints?
        # Split column constraints into table constraints if they have a name
        generator.columns.each do |c|
          if (constraint_name = c.delete(:foreign_key_constraint_name)) && (table = c.delete(:table))
            opts = {}
            opts[:name] = constraint_name
            [:key, :on_delete, :on_update, :deferrable].each{|k| opts[k] = c[k]}
            generator.foreign_key([c[:name]], table, opts)
          end
          if (constraint_name = c.delete(:unique_constraint_name)) && c.delete(:unique)
            generator.unique(c[:name], :name=>constraint_name)
          end
          if (constraint_name = c.delete(:primary_key_constraint_name)) && c.delete(:primary_key)
            generator.primary_key([c[:name]], :name=>constraint_name)
          end
        end
      end

      unless can_add_primary_key_constraint_on_nullable_columns?
        if pk = generator.constraints.find{|op| op[:type] == :primary_key}
          pk[:columns].each do |column|
            if matched_column = generator.columns.find{|gc| gc[:name] == column}
              matched_column[:null] = false
            end
          end
        end
      end

      "#{create_table_prefix_sql(name, options)} (#{column_list_sql(generator)})"
    end

    # Run SQL statement to create the table with the given name from the given
    # SELECT sql statement.
    def create_table_as(name, sql, options)
      sql = sql.sql if sql.is_a?(Sequel::Dataset)
      run(create_table_as_sql(name, sql, options))
    end
    
    # SQL statement for creating a table from the result of a SELECT statement.
    # +sql+ should be a string representing a SELECT query.
    def create_table_as_sql(name, sql, options)
      "#{create_table_prefix_sql(name, options)} AS #{sql}"
    end

    # SQL fragment for initial part of CREATE TABLE statement
    def create_table_prefix_sql(name, options)
      "CREATE #{temporary_table_sql if options[:temp]}TABLE#{' IF NOT EXISTS' if options[:if_not_exists]} #{options[:temp] ? quote_identifier(name) : quote_schema_table(name)}"
    end

    # SQL fragment for initial part of CREATE VIEW statement
    def create_view_prefix_sql(name, options)
      create_view_sql_append_columns("CREATE #{'OR REPLACE 'if options[:replace]}VIEW #{quote_schema_table(name)}", options[:columns])
    end

    # SQL statement for creating a view.
    def create_view_sql(name, source, options)
      source = source.sql if source.is_a?(Dataset)
      sql = String.new
      sql << "#{create_view_prefix_sql(name, options)} AS #{source}"
      if check = options[:check]
        sql << " WITH#{' LOCAL' if check == :local} CHECK OPTION"
      end
      sql
    end

    # Append the column list to the SQL, if a column list is given.
    def create_view_sql_append_columns(sql, columns)
      if columns
        sql += ' ('
        schema_utility_dataset.send(:identifier_list_append, sql, columns)
        sql << ')'
      end
      sql
    end

    # Default index name for the table and columns, may be too long
    # for certain databases.
    def default_index_name(table_name, columns)
      schema, table = schema_and_table(table_name)
      "#{"#{schema}_" if schema}#{table}_#{columns.map{|c| [String, Symbol].any?{|cl| c.is_a?(cl)} ? c : literal(c).gsub(/\W/, '_')}.join('_')}_index"
    end
  
    # Get foreign key name for given table and columns.
    def foreign_key_name(table_name, columns)
      keys = foreign_key_list(table_name).select{|key| key[:columns] == columns}
      raise(Error, "#{keys.empty? ? 'Missing' : 'Ambiguous'} foreign key for #{columns.inspect}") unless keys.size == 1
      keys.first[:name]
    end
    
    # The SQL to drop an index for the table.
    def drop_index_sql(table, op)
      "DROP INDEX #{quote_identifier(op[:name] || default_index_name(table, op[:columns]))}"
    end

    # SQL DDL statement to drop the table with the given name.
    def drop_table_sql(name, options)
      "DROP TABLE#{' IF EXISTS' if options[:if_exists]} #{quote_schema_table(name)}#{' CASCADE' if options[:cascade]}"
    end
    
    # SQL DDL statement to drop a view with the given name.
    def drop_view_sql(name, options)
      "DROP VIEW#{' IF EXISTS' if options[:if_exists]} #{quote_schema_table(name)}#{' CASCADE' if options[:cascade]}"
    end

    # Proxy the filter_expr call to the dataset, used for creating constraints.
    # Support passing Proc arguments as blocks, as well as treating plain strings
    # as literal strings, so that previous migrations that used this API do not break.
    def filter_expr(*args, &block)
      if args.length == 1
        arg = args.first
        if arg.is_a?(Proc) && !block
          block = args.first
          args = nil
        elsif arg.is_a?(String)
          args = [Sequel.lit(*args)]
        elsif arg.is_a?(Array)
          if arg.first.is_a?(String)
            args = [Sequel.lit(*arg)]
          elsif arg.length > 1
            args = [Sequel.&(*arg)]
          end
        end
      end
      schema_utility_dataset.literal(schema_utility_dataset.send(:filter_expr, *args, &block))
    end

    # SQL statement for creating an index for the table with the given name
    # and index specifications.
    def index_definition_sql(table_name, index)
      index_name = index[:name] || default_index_name(table_name, index[:columns])
      raise Error, "Index types are not supported for this database" if index[:type]
      raise Error, "Partial indexes are not supported for this database" if index[:where] && !supports_partial_indexes?
      "CREATE #{'UNIQUE ' if index[:unique]}INDEX #{quote_identifier(index_name)} ON #{quote_schema_table(table_name)} #{literal(index[:columns])}#{" WHERE #{filter_expr(index[:where])}" if index[:where]}"
    end
  
    # Array of SQL statements, one for each index specification,
    # for the given table.
    def index_sql_list(table_name, indexes)
      indexes.map{|i| index_definition_sql(table_name, i)}
    end

    # Extract the join table name from the arguments given to create_join_table.
    # Also does argument validation for the create_join_table method.
    def join_table_name(hash, options)
      entries = hash.values
      raise Error, "must have 2 entries in hash given to (create|drop)_join_table" unless entries.length == 2
      if options[:name]
        options[:name]
      else
        table_names = entries.map{|e| join_table_name_extract(e)}
        table_names.map(&:to_s).sort.join('_')
      end
    end

    # Extract an individual join table name, which should either be a string
    # or symbol, or a hash containing one of those as the value for :table.
    def join_table_name_extract(entry)
      case entry
      when Symbol, String
        entry
      when Hash
        join_table_name_extract(entry[:table])
      else
        raise Error, "can't extract table name from #{entry.inspect}"
      end
    end
    
    # SQL fragment to use for ON DELETE, based on the given action.
    # The following actions are recognized:
    # 
    # :cascade :: Delete rows referencing this row.
    # :no_action :: Raise an error if other rows reference this
    #               row, allow deferring of the integrity check.
    #               This is the default.
    # :restrict :: Raise an error if other rows reference this row,
    #              but do not allow deferring the integrity check.
    # :set_default :: Set columns referencing this row to their default value.
    # :set_null :: Set columns referencing this row to NULL.
    #
    # Any other object given is just converted to a string, with "_" converted to " " and upcased.
    def on_delete_clause(action)
      action.to_s.gsub("_", " ").upcase
    end

    # Alias of #on_delete_clause, since the two usually behave the same.
    def on_update_clause(action)
      on_delete_clause(action)
    end
    
    # Proxy the quote_schema_table method to the dataset
    def quote_schema_table(table)
      schema_utility_dataset.quote_schema_table(table)
    end
    
    # SQL statement for renaming a table.
    def rename_table_sql(name, new_name)
      "ALTER TABLE #{quote_schema_table(name)} RENAME TO #{quote_schema_table(new_name)}"
    end

    # Split the schema information from the table
    def schema_and_table(table_name)
      schema_utility_dataset.schema_and_table(table_name)
    end

    # Return true if the given column schema represents an autoincrementing primary key.
    def schema_autoincrementing_primary_key?(schema)
      !!(schema[:primary_key] && schema[:auto_increment])
    end

    # The dataset to use for proxying certain schema methods.
    def schema_utility_dataset
      @default_dataset
    end

    # Split the schema information from the table
    def split_qualifiers(table_name)
      schema_utility_dataset.split_qualifiers(table_name)
    end

    # SQL fragment for temporary table
    def temporary_table_sql
      'TEMPORARY '
    end

    # SQL fragment specifying the type of a given column.
    def type_literal(column)
      case column[:type]
      when Class
        type_literal_generic(column)
      when :Bignum
        type_literal_generic_bignum_symbol(column)
      else
        type_literal_specific(column)
      end
    end
    
    # SQL fragment specifying the full type of a column,
    # consider the type with possible modifiers.
    def type_literal_generic(column)
      meth = "type_literal_generic_#{column[:type].name.to_s.downcase}"
      if respond_to?(meth, true)
        # Allow calling private methods as per type literal generic methods are private
        send(meth, column)
      else
        raise Error, "Unsupported ruby class used as database type: #{column[:type]}"
      end
    end

    # Alias for type_literal_generic_numeric, to make overriding in a subclass easier.
    def type_literal_generic_bigdecimal(column)
      type_literal_generic_numeric(column)
    end

    # Sequel uses the bigint type by default for :Bignum symbol.
    def type_literal_generic_bignum_symbol(column)
      :bigint
    end

    # Sequel uses the date type by default for Dates.
    def type_literal_generic_date(column)
      :date
    end

    # Sequel uses the timestamp type by default for DateTimes.
    def type_literal_generic_datetime(column)
      :timestamp
    end

    # Alias for type_literal_generic_trueclass, to make overriding in a subclass easier.
    def type_literal_generic_falseclass(column)
      type_literal_generic_trueclass(column)
    end

    # Sequel uses the blob type by default for Files.
    def type_literal_generic_file(column)
      :blob
    end

    # Alias for type_literal_generic_integer, to make overriding in a subclass easier.
    def type_literal_generic_fixnum(column)
      type_literal_generic_integer(column)
    end

    # Sequel uses the double precision type by default for Floats.
    def type_literal_generic_float(column)
      :"double precision"
    end

    # Sequel uses the integer type by default for integers
    def type_literal_generic_integer(column)
      :integer
    end

    # Sequel uses the numeric type by default for Numerics and BigDecimals.
    # If a size is given, it is used, otherwise, it will default to whatever
    # the database default is for an unsized value.
    def type_literal_generic_numeric(column)
      column[:size] ? "numeric(#{Array(column[:size]).join(', ')})" : :numeric
    end

    # Sequel uses the varchar type by default for Strings.  If a
    # size isn't present, Sequel assumes a size of 255.  If the
    # :fixed option is used, Sequel uses the char type.  If the
    # :text option is used, Sequel uses the :text type.
    def type_literal_generic_string(column)
      if column[:text]
        uses_clob_for_text? ? :clob : :text
      elsif column[:fixed]
        "char(#{column[:size]||default_string_column_size})"
      else
        "varchar(#{column[:size]||default_string_column_size})"
      end
    end
    
    # Sequel uses the timestamp type by default for Time values.
    # If the :only_time option is used, the time type is used.
    def type_literal_generic_time(column)
      if column[:only_time]
        type_literal_generic_only_time(column)
      else
        type_literal_generic_datetime(column)
      end
    end

    # Use time by default for Time values if :only_time option is used.
    def type_literal_generic_only_time(column)
      :time
    end

    # Sequel uses the boolean type by default for TrueClass and FalseClass.
    def type_literal_generic_trueclass(column)
      :boolean
    end

    # SQL fragment for the given type of a column if the column is not one of the
    # generic types specified with a ruby class.
    def type_literal_specific(column)
      type = column[:type]
      type = "double precision" if type.to_s == 'double'
      column[:size] ||= default_string_column_size if type.to_s == 'varchar'
      elements = column[:size] || column[:elements]
      "#{type}#{literal(Array(elements)) if elements}#{' UNSIGNED' if column[:unsigned]}"
    end

    # Whether clob should be used for String text: true columns.
    def uses_clob_for_text?
      false
    end
  end
end
