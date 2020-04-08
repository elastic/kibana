# frozen-string-literal: true

module Sequel
  # The Schema module holds the schema generators.
  module Schema
    # Schema::CreateTableGenerator is an internal class that the user is not expected
    # to instantiate directly.  Instances are created by Database#create_table.
    # It is used to specify table creation parameters.  It takes a Database
    # object and a block of column/index/constraint specifications, and
    # gives the Database a table description, which the database uses to
    # create a table.
    #
    # Schema::CreateTableGenerator has some methods but also includes method_missing,
    # allowing users to specify column type as a method instead of using
    # the column method, which makes for a nicer DSL.
    #
    # For more information on Sequel's support for schema modification, see
    # the {"Schema Modification" guide}[rdoc-ref:doc/schema_modification.rdoc].
    class CreateTableGenerator
      # Classes specifying generic types that Sequel will convert to database-specific types.
      GENERIC_TYPES=%w'String Integer Float Numeric BigDecimal Date DateTime Time File TrueClass FalseClass'.freeze
      
      # Column hashes created by this generator
      attr_reader :columns

      # Constraint hashes created by this generator
      attr_reader :constraints

      # Index hashes created by this generator
      attr_reader :indexes

      # Set the database in which to create the table, and evaluate the block
      # in the context of this object.
      def initialize(db, &block)
        @db = db
        @columns = []
        @indexes = []
        @constraints = []
        @primary_key = nil
        instance_exec(&block) if block
        @columns.unshift(@primary_key) if @primary_key && !has_column?(primary_key_name)
      end

      # Use custom Bignum method to use :Bignum instead of Bignum class, to work
      # correctly in cases where Bignum is the same as Integer.
      def Bignum(name, opts=OPTS)
        column(name, :Bignum, opts)
      end
      
      # Use custom Fixnum method to use Integer instead of Fixnum class, to avoid 
      # warnings on ruby 2.4+.
      def Fixnum(name, opts=OPTS)
        column(name, Integer, opts)
      end

      # Add a method for each of the given types that creates a column
      # with that type as a constant.  Types given should either already
      # be constants/classes or a capitalized string/symbol with the same name
      # as a constant/class.
      def self.add_type_method(*types)
        types.each do |type|
          case type
          when Symbol, String
            method = type
            type = Object.const_get(type)
          else
            method = type.to_s
          end

          define_method(method){|name, opts=OPTS| column(name, type, opts)}
        end
        nil
      end
      
      # Add an unnamed constraint, specified by the given block
      # or args:
      #
      #   check(num: 1..5) # CHECK num >= 1 AND num <= 5
      #   check{num > 5}   # CHECK num > 5
      def check(*args, &block)
        constraint(nil, *args, &block)
      end

      # Add a column with the given name, type, and opts:
      #
      #   column :num, :integer
      #   # num INTEGER
      #
      #   column :name, String, null: false, default: 'a'
      #   # name varchar(255) NOT NULL DEFAULT 'a'
      #
      #   inet :ip
      #   # ip inet
      #
      # You can also create columns via method missing, so the following are
      # equivalent:
      #
      #   column :number, :integer
      #   integer :number
      #
      # The following options are supported:
      #
      # :collate :: The collation to use for the column.  For backwards compatibility,
      #             only symbols and string values are supported, and they are used verbatim.
      #             However, on PostgreSQL, symbols are literalized as regular identifiers,
      #             since unquoted collations are unlikely to be valid.
      # :default :: The default value for the column.
      # :deferrable :: For foreign key columns, this ensures referential integrity will work even if
      #                referencing table uses a foreign key value that does not
      #                yet exist on referenced table (but will exist before the transaction commits).
      #                Basically it adds DEFERRABLE INITIALLY DEFERRED on key creation.
      #                If you use :immediate as the value, uses DEFERRABLE INITIALLY IMMEDIATE.
      # :generated_always_as :: Specify a GENERATED ALWAYS AS column expression,
      #                         if generated columns are supported (PostgreSQL 12+, MariaDB 5.2.0+,
      #                         and MySQL 5.7.6+).
      # :index :: Create an index on this column.  If given a hash, use the hash as the
      #           options for the index.
      # :key :: For foreign key columns, the column in the associated table
      #         that this column references.  Unnecessary if this column
      #         references the primary key of the associated table, except if you are
      #         using MySQL.
      # :null :: Mark the column as allowing NULL values (if true),
      #          or not allowing NULL values (if false).  The default is to allow NULL values.
      # :on_delete :: Specify the behavior of this column when being deleted
      #               (:restrict, :cascade, :set_null, :set_default, :no_action).
      # :on_update :: Specify the behavior of this column when being updated
      #               (:restrict, :cascade, :set_null, :set_default, :no_action).
      # :primary_key :: Make the column as a single primary key column.  This should not
      #                 be used if you have a single, nonautoincrementing primary key column
      #                 (use the primary_key method in that case).
      # :primary_key_constraint_name :: The name to give the primary key constraint
      # :primary_key_deferrable :: Similar to :deferrable, but for the primary key constraint
      #                            if :primary_key is used.
      # :type :: Overrides the type given as the argument.  Generally not used by column
      #          itself, but can be passed as an option to other methods that call column.
      # :unique :: Mark the column as unique, generally has the same effect as
      #            creating a unique index on the column.
      # :unique_constraint_name :: The name to give the unique key constraint
      # :unique_deferrable :: Similar to :deferrable, but for the unique constraint if :unique
      #                       is used.
      #
      # PostgreSQL specific options:
      #
      # :identity :: Create an identity column.
      #
      # MySQL specific options:
      # :generated_type :: Set the type of column when using :generated_always_as,
      #                    should be :virtual or :stored to force a type.
      def column(name, type, opts = OPTS)
        columns << {:name => name, :type => type}.merge!(opts)
        if index_opts = opts[:index]
          index(name, index_opts.is_a?(Hash) ? index_opts : OPTS)
        end
        nil
      end
      
      # Adds a named constraint (or unnamed if name is nil),
      # with the given block or args. To provide options for the constraint, pass
      # a hash as the first argument.
      #
      #   constraint(:blah, num: 1..5)
      #   # CONSTRAINT blah CHECK num >= 1 AND num <= 5
      #   constraint({name: :blah, deferrable: true}, num: 1..5)
      #   # CONSTRAINT blah CHECK num >= 1 AND num <= 5 DEFERRABLE INITIALLY DEFERRED
      def constraint(name, *args, &block)
        opts = name.is_a?(Hash) ? name : {:name=>name}
        constraints << opts.merge(:type=>:check, :check=>block || args)
        nil
      end
      
      # Add a foreign key in the table that references another table. See #column
      # for available options.
      #
      #   foreign_key(:artist_id) # artist_id INTEGER
      #   foreign_key(:artist_id, :artists) # artist_id INTEGER REFERENCES artists
      #   foreign_key(:artist_id, :artists, key: :id) # artist_id INTEGER REFERENCES artists(id)
      #   foreign_key(:artist_id, :artists, type: String) # artist_id varchar(255) REFERENCES artists(id)
      #
      # Additional Options:
      #
      # :foreign_key_constraint_name :: The name to give the foreign key constraint
      #
      # If you want a foreign key constraint without adding a column (usually because it is a
      # composite foreign key), you can provide an array of columns as the first argument, and
      # you can provide the :name option to name the constraint:
      #
      #   foreign_key([:artist_name, :artist_location], :artists, name: :artist_fk)
      #   # ADD CONSTRAINT artist_fk FOREIGN KEY (artist_name, artist_location) REFERENCES artists
      def foreign_key(name, table=nil, opts = OPTS)
        opts = case table
        when Hash
          table.merge(opts)
        when NilClass
          opts
        else
          opts.merge(:table=>table)
        end
        return composite_foreign_key(name, opts) if name.is_a?(Array)
        column(name, Integer, opts)
      end

      # Add a full text index on the given columns.
      #
      # PostgreSQL specific options:
      # :index_type :: Can be set to :gist to use a GIST index instead of the
      #                default GIN index.
      # :language :: Set a language to use for the index (default: simple).
      #
      # Microsoft SQL Server specific options:
      # :key_index :: The KEY INDEX to use for the full text index.
      def full_text_index(columns, opts = OPTS)
        index(columns, opts.merge(:type => :full_text))
      end
      
      # True if the generator includes the creation of a column with the given name.
      def has_column?(name)
        columns.any?{|c| c[:name] == name}
      end
      
      # Add an index on the given column(s) with the given options.
      # General options:
      #
      # :name :: The name to use for the index. If not given, a default name
      #          based on the table and columns is used.
      # :type :: The type of index to use (only supported by some databases)
      # :unique :: Make the index unique, so duplicate values are not allowed.
      # :where :: Create a partial index (only supported by some databases)
      #
      # PostgreSQL specific options:
      #
      # :concurrently :: Create the index concurrently, so it doesn't block
      #                  operations on the table while the index is being
      #                  built.
      # :opclass :: Use a specific operator class in the index.
      # :include :: Include additional column values in the index, without
      #             actually indexing on those values (PostgreSQL 11+).
      # :tablespace :: Specify tablespace for index.
      #
      # Microsoft SQL Server specific options:
      #
      # :include :: Include additional column values in the index, without
      #             actually indexing on those values.
      #
      #   index :name
      #   # CREATE INDEX table_name_index ON table (name)
      #
      #   index [:artist_id, :name]
      #   # CREATE INDEX table_artist_id_name_index ON table (artist_id, name)
      def index(columns, opts = OPTS)
        indexes << {:columns => Array(columns)}.merge!(opts)
        nil
      end
      
      # Add a column with the given type, name, and opts.  See #column for available
      # options.
      def method_missing(type, name = nil, opts = OPTS)
        name ? column(name, type, opts) : super
      end

      # This object responds to all methods.
      def respond_to_missing?(meth, include_private)
        true
      end
      
      # Adds an autoincrementing primary key column or a primary key constraint.
      # To just create a constraint, the first argument should be an array of column symbols
      # specifying the primary key columns. To create an autoincrementing primary key
      # column, a single symbol can be used. In both cases, an options hash can be used
      # as the second argument.
      # 
      # If you want to create a primary key column that is not autoincrementing, you
      # should not use this method.  Instead, you should use the regular +column+ method
      # with a <tt>primary_key: true</tt> option.
      #
      # If an array of column symbols is used, you can specify the :name option
      # to name the constraint.
      #
      # Options:
      # :keep_order :: For non-composite primary keys, respects the existing order of
      #                columns, overriding the default behavior of making the primary
      #                key the first column.
      # 
      # Examples:
      #   primary_key(:id)
      #   primary_key(:id, type: :Bignum, keep_order: true)
      #   primary_key([:street_number, :house_number], name: :some constraint_name)
      def primary_key(name, *args)
        return composite_primary_key(name, *args) if name.is_a?(Array)
        column = @db.serial_primary_key_options.merge({:name => name})
        
        if opts = args.pop
          opts = {:type => opts} unless opts.is_a?(Hash)
          if type = args.pop
            opts = opts.merge(:type => type)
          end
          column.merge!(opts)
        end

        @primary_key = column
        if column[:keep_order]
          columns << column
        else
          columns.unshift(column)
        end
        nil
      end

      # The name of the primary key for this generator, if it has a primary key.
      def primary_key_name
        @primary_key[:name] if @primary_key
      end
      
      # Add a spatial index on the given columns.
      def spatial_index(columns, opts = OPTS)
        index(columns, opts.merge(:type => :spatial))
      end

      # Add a unique constraint on the given columns.
      #
      #   unique(:name) # UNIQUE (name)
      #
      # Supports the same :deferrable option as #column. The :name option can be used
      # to name the constraint.
      def unique(columns, opts = OPTS)
        constraints << {:type => :unique, :columns => Array(columns)}.merge!(opts)
        nil
      end

      private

      # Add a composite primary key constraint
      def composite_primary_key(columns, *args)
        opts = args.pop || OPTS
        constraints << {:type => :primary_key, :columns => columns}.merge!(opts)
        nil
      end

      # Add a composite foreign key constraint
      def composite_foreign_key(columns, opts)
        constraints << {:type => :foreign_key, :columns => columns}.merge!(opts)
        nil
      end
      
      add_type_method(*GENERIC_TYPES)
    end

    # Schema::AlterTableGenerator is an internal class that the user is not expected
    # to instantiate directly.  Instances are created by Database#alter_table.
    # It is used to specify table alteration parameters.  It takes a Database
    # object and a block of operations to perform on the table, and
    # gives the Database an array of table altering operations, which the database uses to
    # alter a table's description.
    #
    # For more information on Sequel's support for schema modification, see
    # the {"Schema Modification" guide}[link:files/doc/schema_modification_rdoc.html].
    class AlterTableGenerator
      # An array of operations to perform
      attr_reader :operations
      
      # Set the Database object to which to apply the changes, and evaluate the
      # block in the context of this object.
      def initialize(db, &block)
        @db = db
        @operations = []
        instance_exec(&block) if block
      end
      
      # Add a column with the given name, type, and opts.
      # See CreateTableGenerator#column for the available options (except for +:index+, use a
      # separate +add_index+ call to add an index for the column).
      #
      #   add_column(:name, String) # ADD COLUMN name varchar(255)
      #
      # PostgreSQL specific options:
      #
      # :if_not_exists :: Set to true to not add the column if it already exists (PostgreSQL 9.6+)
      #
      # MySQL specific options:
      #
      # :after :: The name of an existing column that the new column should be positioned after
      # :first :: Create this new column before all other existing columns
      def add_column(name, type, opts = OPTS)
        @operations << {:op => :add_column, :name => name, :type => type}.merge!(opts)
        nil
      end
      
      # Add a constraint with the given name and args.
      # See CreateTableGenerator#constraint.
      #
      #   add_constraint(:valid_name, Sequel.like(:name, 'A%'))
      #   # ADD CONSTRAINT valid_name CHECK (name LIKE 'A%' ESCAPE '\')
      #   add_constraint({name: :valid_name, deferrable: true}, Sequel.like(:name, 'A%'))
      #   # ADD CONSTRAINT valid_name CHECK (name LIKE 'A%' ESCAPE '\') DEFERRABLE INITIALLY DEFERRED
      def add_constraint(name, *args, &block)
        opts = name.is_a?(Hash) ? name : {:name=>name}
        @operations << opts.merge(:op=>:add_constraint, :type=>:check, :check=>block || args)
        nil
      end

      # Add a unique constraint to the given column(s)
      #
      #   add_unique_constraint(:name) # ADD UNIQUE (name)
      #   add_unique_constraint(:name, name: :unique_name) # ADD CONSTRAINT unique_name UNIQUE (name)
      #
      # Supports the same :deferrable option as CreateTableGenerator#column.
      def add_unique_constraint(columns, opts = OPTS)
        @operations << {:op => :add_constraint, :type => :unique, :columns => Array(columns)}.merge!(opts)
        nil
      end

      # Add a foreign key with the given name and referencing the given table.
      # See CreateTableGenerator#column for the available options (except for +:index+, use a
      # separate +add_index+ call to add an index for the column).
      #
      # You can also pass an array of column names for creating composite foreign
      # keys. In this case, it will assume the columns exist and will only add
      # the constraint.  You can provide a :name option to name the constraint.
      #
      # NOTE: If you need to add a foreign key constraint to a single existing column
      # use the composite key syntax even if it is only one column.
      #
      #   add_foreign_key(:artist_id, :table) # ADD COLUMN artist_id integer REFERENCES table
      #   add_foreign_key([:name], :table) # ADD FOREIGN KEY (name) REFERENCES table
      #
      # PostgreSQL specific options:
      #
      # :not_valid :: Set to true to add the constraint with the NOT VALID syntax.
      #               This makes it so that future inserts must respect referential
      #               integrity, but allows the constraint to be added even if existing
      #               column values reference rows that do not exist.  After all the
      #               existing data has been cleaned up, validate_constraint can be used
      #               to mark the constraint as valid.  Note that this option only makes
      #               sense when using an array of columns.
      def add_foreign_key(name, table, opts = OPTS)
        return add_composite_foreign_key(name, table, opts) if name.is_a?(Array)
        add_column(name, Integer, {:table=>table}.merge!(opts))
      end
      
      # Add a full text index on the given columns.
      # See CreateTableGenerator#index for available options.
      def add_full_text_index(columns, opts = OPTS)
        add_index(columns, {:type=>:full_text}.merge!(opts))
      end
      
      # Add an index on the given columns. See
      # CreateTableGenerator#index for available options.
      #
      #   add_index(:artist_id) # CREATE INDEX table_artist_id_index ON table (artist_id)
      #
      # Options:
      #
      # :name :: Give a specific name for the index. Highly recommended if you plan on
      #          dropping the index later.
      # :where :: A filter expression, used to setup a partial index (if supported).
      # :unique :: Create a unique index.
      #
      # PostgreSQL specific options:
      #
      # :concurrently :: Create the index concurrently, so it doesn't require an exclusive lock
      #                  on the table.
      # :index_type :: The underlying index type to use for a full_text index, gin by default).
      # :language :: The language to use for a full text index (simple by default).
      # :opclass :: Set an opclass to use for all columns (per-column opclasses require
      #             custom SQL).
      # :type :: Set the index type (e.g. full_text, spatial, hash, gin, gist, btree).
      # :if_not_exists :: Only create the index if an index of the same name doesn't already exists
      #
      # MySQL specific options:
      #
      # :type :: Set the index type, with full_text and spatial indexes handled specially.
      #
      # Microsoft SQL Server specific options:
      #
      # :include :: Includes additional columns in the index.
      # :key_index :: Sets the KEY INDEX to the given value.
      # :type :: clustered uses a clustered index, full_text uses a full text index.
      def add_index(columns, opts = OPTS)
        @operations << {:op => :add_index, :columns => Array(columns)}.merge!(opts)
        nil
      end
      
      # Add a primary key.  See CreateTableGenerator#column
      # for the available options.  Like +add_foreign_key+, if you specify
      # the column name as an array, it just creates a constraint:
      #
      #   add_primary_key(:id) # ADD COLUMN id serial PRIMARY KEY
      #   add_primary_key([:artist_id, :name]) # ADD PRIMARY KEY (artist_id, name)
      def add_primary_key(name, opts = OPTS)
        return add_composite_primary_key(name, opts) if name.is_a?(Array)
        opts = @db.serial_primary_key_options.merge(opts)
        add_column(name, opts.delete(:type), opts)
      end
      
      # Add a spatial index on the given columns.
      # See CreateTableGenerator#index for available options.
      def add_spatial_index(columns, opts = OPTS)
        add_index(columns, {:type=>:spatial}.merge!(opts))
      end
      
      # Remove a column from the table.
      #
      #   drop_column(:artist_id) # DROP COLUMN artist_id
      #   drop_column(:artist_id, cascade: true) # DROP COLUMN artist_id CASCADE
      #
      # Options:
      #
      # :cascade :: CASCADE the operation, dropping other objects that depend on
      #             the dropped column.
      # 
      # PostgreSQL specific options:
      # :if_exists :: Use IF EXISTS, so no error is raised if the column does not
      #               exist.
      def drop_column(name, opts=OPTS)
        @operations << {:op => :drop_column, :name => name}.merge!(opts)
        nil
      end
      
      # Remove a constraint from the table:
      #
      #   drop_constraint(:unique_name) # DROP CONSTRAINT unique_name
      #   drop_constraint(:unique_name, cascade: true) # DROP CONSTRAINT unique_name CASCADE
      #
      # MySQL/SQLite specific options:
      #
      # :type :: Set the type of constraint to drop, either :primary_key, :foreign_key,
      #          or :unique.
      def drop_constraint(name, opts=OPTS)
        @operations << {:op => :drop_constraint, :name => name}.merge!(opts)
        nil
      end
      
      # Remove a foreign key and the associated column from the table. General options:
      #
      # :name :: The name of the constraint to drop.  If not given, uses the same name
      #          that would be used by add_foreign_key with the same columns.
      #
      # NOTE: If you want to drop only the foreign key constraint but keep the column,
      # use the composite key syntax even if it is only one column.
      #
      #   drop_foreign_key(:artist_id) # DROP CONSTRAINT table_artist_id_fkey, DROP COLUMN artist_id
      #   drop_foreign_key([:name]) # DROP CONSTRAINT table_name_fkey
      def drop_foreign_key(name, opts=OPTS)
        if !name.is_a?(Array) && opts[:foreign_key_constraint_name]
          opts = Hash[opts]
          opts[:name] = opts[:foreign_key_constraint_name]
        end
        drop_composite_foreign_key(Array(name), opts)
        drop_column(name) unless name.is_a?(Array)
      end
      
      # Remove an index from the table. General options:
      #
      # :name :: The name of the index to drop.  If not given, uses the same name
      #          that would be used by add_index with the same columns.
      #
      # PostgreSQL specific options:
      #
      # :cascade :: Cascade the index drop to dependent objects.
      # :concurrently :: Drop the index using CONCURRENTLY, which doesn't block
      #                  operations on the table.  Supported in PostgreSQL 9.2+.
      # :if_exists :: Only drop the index if it already exists.
      #
      #   drop_index(:artist_id) # DROP INDEX table_artist_id_index
      #   drop_index([:a, :b]) # DROP INDEX table_a_b_index
      #   drop_index([:a, :b], name: :foo) # DROP INDEX foo
      def drop_index(columns, options=OPTS)
        @operations << {:op => :drop_index, :columns => Array(columns)}.merge!(options)
        nil
      end

      # Rename one of the table's columns.
      #
      #   rename_column(:name, :artist_name) # RENAME COLUMN name TO artist_name
      def rename_column(name, new_name, opts = OPTS)
        @operations << {:op => :rename_column, :name => name, :new_name => new_name}.merge!(opts)
        nil
      end
      
      # Modify the default value for one of the table's column.
      #
      #   set_column_default(:artist_name, 'a') # ALTER COLUMN artist_name SET DEFAULT 'a'
      #
      # To remove an existing default value, use +nil+ as the value:
      #
      #   set_column_default(:artist_name, nil) # ALTER COLUMN artist_name SET DEFAULT NULL
      #
      # On MySQL, make sure to use a symbol for the name of the column, as otherwise you
      # can lose the type and NULL/NOT NULL setting for the column.
      def set_column_default(name, default)
        @operations << {:op => :set_column_default, :name => name, :default => default}
        nil
      end

      # Modify the type of one of the table's column.
      #
      #   set_column_type(:artist_name, 'char(10)') # ALTER COLUMN artist_name TYPE char(10)
      #
      # PostgreSQL specific options:
      #
      # :using :: Add a USING clause that specifies how to convert existing values to new values.
      #
      # On MySQL, make sure to use a symbol for the name of the column, as otherwise you
      # can lose the default and NULL/NOT NULL setting for the column.
      def set_column_type(name, type, opts=OPTS)
        @operations << {:op => :set_column_type, :name => name, :type => type}.merge!(opts)
        nil
      end
      
      # Set a given column as allowing NULL values.
      #
      #   set_column_allow_null(:artist_name) # ALTER COLUMN artist_name DROP NOT NULL
      #
      # On MySQL, make sure to use a symbol for the name of the column, as otherwise you
      # can lose the default and type for the column.
      def set_column_allow_null(name, allow_null=true)
        @operations << {:op => :set_column_null, :name => name, :null => allow_null}
        nil
      end

      # Set a given column as not allowing NULL values.
      #
      #   set_column_not_null(:artist_name) # ALTER COLUMN artist_name SET NOT NULL
      #
      # On MySQL, make sure to use a symbol for the name of the column, as otherwise you
      # can lose the default and type for the column.
      def set_column_not_null(name)
        set_column_allow_null(name, false)
      end

      private

      # Add a composite primary key constraint
      def add_composite_primary_key(columns, opts)
        @operations << {:op => :add_constraint, :type => :primary_key, :columns => columns}.merge!(opts)
        nil
      end

      # Add a composite foreign key constraint
      def add_composite_foreign_key(columns, table, opts)
        @operations << {:op => :add_constraint, :type => :foreign_key, :columns => columns, :table => table}.merge!(opts)
        nil
      end

      # Drop a composite foreign key constraint
      def drop_composite_foreign_key(columns, opts)
        @operations << opts.merge(:op => :drop_constraint, :type => :foreign_key, :columns => columns)
        nil
      end
    end
  end
end

