# frozen-string-literal: true

module Sequel
  class Model
    extend Enumerable
    extend Inflections

    # Class methods for Sequel::Model that implement basic model functionality.
    #
    # * All of the following methods have class methods created that send the method
    #   to the model's dataset: all, as_hash, avg, count, cross_join, distinct, each,
    #   each_server, empty?, except, exclude, exclude_having, fetch_rows,
    #   filter, first, first!, for_update, from, from_self, full_join, full_outer_join,
    #   get, graph, grep, group, group_and_count, group_append, group_by, having, import,
    #   inner_join, insert, intersect, invert, join, join_table, last, left_join,
    #   left_outer_join, limit, lock_style, map, max, min, multi_insert, naked, natural_full_join,
    #   natural_join, natural_left_join, natural_right_join, offset, order, order_append, order_by,
    #   order_more, order_prepend, paged_each, qualify, reverse, reverse_order, right_join,
    #   right_outer_join, select, select_all, select_append, select_group, select_hash,
    #   select_hash_groups, select_map, select_more, select_order_map, server,
    #   single_record, single_record!, single_value, single_value!, sum, to_hash, to_hash_groups,
    #   truncate, unfiltered, ungraphed, ungrouped, union, unlimited, unordered, where, where_all,
    #   where_each, where_single_value, with, with_recursive, with_sql
    module ClassMethods
      # Whether to cache the anonymous models created by Sequel::Model(), true by default.  This is
      # required for reloading them correctly (avoiding the superclass mismatch).
      attr_accessor :cache_anonymous_models

      # Array of modules that extend this model's dataset.  Stored
      # so that if the model's dataset is changed, it will be extended
      # with all of these modules.
      attr_reader :dataset_method_modules

      # The Module subclass to use for dataset_module blocks.
      attr_reader :dataset_module_class

      # The default options to use for Model#set_fields.  These are merged with
      # the options given to set_fields.
      attr_accessor :default_set_fields_options

      # SQL string fragment used for faster DELETE statement creation when deleting/destroying
      # model instances, or nil if the optimization should not be used. For internal use only.
      attr_reader :fast_instance_delete_sql

      # SQL string fragment used for faster lookups by primary key, or nil if the optimization
      # should not be used. For internal use only.
      attr_reader :fast_pk_lookup_sql

      # The dataset that instance datasets (#this) are based on.  Generally a naked version of
      # the model's dataset limited to one row.  For internal use only.
      attr_reader :instance_dataset

      # Array of plugin modules loaded by this class
      #
      #   Sequel::Model.plugins
      #   # => [Sequel::Model, Sequel::Model::Associations]
      attr_reader :plugins
  
      # The primary key for the class.  Sequel can determine this automatically for
      # many databases, but not all, so you may need to set it manually.  If not
      # determined automatically, the default is :id.
      attr_reader :primary_key
  
      # Whether to raise an error instead of returning nil on a failure
      # to save/create/save_changes/update/destroy due to a validation failure or
      # a before_* hook returning false (default: true). 
      attr_accessor :raise_on_save_failure
  
      # Whether to raise an error when unable to typecast data for a column
      # (default: false).  This should be set to true if you want to have model
      # setter methods raise errors if the argument cannot be typecast properly.
      attr_accessor :raise_on_typecast_failure
      
      # Whether to raise an error if an UPDATE or DELETE query related to
      # a model instance does not modify exactly 1 row.  If set to false,
      # Sequel will not check the number of rows modified (default: true).
      attr_accessor :require_modification
  
      # If true (the default), requires that all models have valid tables,
      # raising exceptions if creating a model without a valid table backing it.
      # Setting this to false will allow the creation of model classes where the
      # underlying table doesn't exist.
      attr_accessor :require_valid_table

      # Should be the literal primary key column name if this Model's table has a simple primary key, or
      # nil if the model has a compound primary key or no primary key.
      attr_reader :simple_pk
  
      # Should be the literal table name if this Model's dataset is a simple table (no select, order, join, etc.),
      # or nil otherwise.  This and simple_pk are used for an optimization in Model.[].
      attr_reader :simple_table
  
      # Whether mass assigning via .create/.new/#set/#update should raise an error
      # if an invalid key is used.  A key is invalid if no setter method exists
      # for that key or the access to the setter method is restricted (e.g. due to it
      # being a primary key field).  If set to false, silently skip
      # any key where the setter method doesn't exist or access to it is restricted.
      attr_accessor :strict_param_setting
  
      # Whether to typecast the empty string ('') to nil for columns that
      # are not string or blob.  In most cases the empty string would be the
      # way to specify a NULL SQL value in string form (nil.to_s == ''),
      # and an empty string would not usually be typecast correctly for other
      # types, so the default is true.
      attr_accessor :typecast_empty_string_to_nil
  
      # Whether to typecast attribute values on assignment (default: true).
      # If set to false, no typecasting is done, so it will be left up to the
      # database to typecast the value correctly.
      attr_accessor :typecast_on_assignment
  
      # Whether to use a transaction by default when saving/deleting records (default: true).
      # If you are sending database queries in before_* or after_* hooks, you shouldn't change
      # the default setting without a good reason.
      attr_accessor :use_transactions

      # Define a Model method on the given module that calls the Model
      # method on the receiver.  This is how the Sequel::Model() method is
      # defined, and allows you to define Model() methods on other modules,
      # making it easier to have custom model settings for all models under
      # a namespace.  Example:
      #
      #   module Foo
      #     Model = Class.new(Sequel::Model)
      #     Model.def_Model(self)
      #     DB = Model.db = Sequel.connect(ENV['FOO_DATABASE_URL'])
      #     Model.plugin :prepared_statements
      #
      #     class Bar < Model
      #       # Uses Foo::DB[:bars]
      #     end
      #
      #     class Baz < Model(:my_baz)
      #       # Uses Foo::DB[:my_baz]
      #     end
      #   end
      def def_Model(mod)
        model = self
        mod.define_singleton_method(:Model) do |source|
          model.Model(source)
        end
      end

      # Lets you create a Model subclass with its dataset already set.
      # +source+ should be an instance of one of the following classes:
      #
      # Database :: Sets the database for this model to +source+.
      #             Generally only useful when subclassing directly
      #             from the returned class, where the name of the
      #             subclass sets the table name (which is combined
      #             with the +Database+ in +source+ to create the
      #             dataset to use) 
      # Dataset :: Sets the dataset for this model to +source+. 
      # other :: Sets the table name for this model to +source+. The
      #          class will use the default database for model
      #          classes in order to create the dataset.
      #
      # The purpose of this method is to set the dataset/database automatically
      # for a model class, if the table name doesn't match the default table
      # name that Sequel would use.
      #
      # When creating subclasses of Sequel::Model itself, this method is usually
      # called on Sequel itself, using <tt>Sequel::Model(:something)</tt>.
      #
      #   # Using a symbol
      #   class Comment < Sequel::Model(:something)
      #     table_name # => :something
      #   end
      #
      #   # Using a dataset
      #   class Comment < Sequel::Model(DB1[:something])
      #     dataset # => DB1[:something]
      #   end
      #
      #   # Using a database
      #   class Comment < Sequel::Model(DB1)
      #     dataset # => DB1[:comments]
      #   end
      def Model(source)
        if cache_anonymous_models
          cache = Sequel.synchronize{@Model_cache ||= {}}
          if klass = Sequel.synchronize{cache[source]}
            return klass
          end
        end

        klass = Class.new(self)

        if source.is_a?(::Sequel::Database)
          klass.db = source
        else
          klass.set_dataset(source)
        end

        if cache_anonymous_models
          Sequel.synchronize{cache[source] = klass}
        end

        klass
      end
  
      # Returns the first record from the database matching the conditions.
      # If a hash is given, it is used as the conditions.  If another
      # object is given, it finds the first record whose primary key(s) match
      # the given argument(s).  If no object is returned by the dataset, returns nil.
      # 
      #   Artist[1] # SELECT * FROM artists WHERE id = 1
      #   # => #<Artist {:id=>1, ...}>
      #
      #   Artist[name: 'Bob'] # SELECT * FROM artists WHERE (name = 'Bob') LIMIT 1
      #   # => #<Artist {:name=>'Bob', ...}>
      def [](*args)
        args = args.first if args.size <= 1
        args.is_a?(Hash) ? first(args) : (primary_key_lookup(args) unless args.nil?)
      end

      # Initializes a model instance as an existing record. This constructor is
      # used by Sequel to initialize model instances when fetching records.
      # Requires that values be a hash where all keys are symbols. It
      # probably should not be used by external code.
      def call(values)
        o = allocate
        o.instance_variable_set(:@values, values)
        o
      end
      
      # Clear the setter_methods cache
      def clear_setter_methods_cache
        @setter_methods = nil unless frozen?
      end
  
      # Returns the columns in the result set in their original order.
      # Generally, this will use the columns determined via the database
      # schema, but in certain cases (e.g. models that are based on a joined
      # dataset) it will use <tt>Dataset#columns</tt> to find the columns.
      #
      #   Artist.columns
      #   # => [:id, :name]
      def columns
        return @columns if @columns
        return nil if frozen?
        set_columns(dataset.naked.columns)
      end
    
      # Creates instance using new with the given values and block, and saves it.
      # 
      #   Artist.create(name: 'Bob')
      #   # INSERT INTO artists (name) VALUES ('Bob')
      #
      #   Artist.create do |a|
      #     a.name = 'Jim'
      #   end # INSERT INTO artists (name) VALUES ('Jim')
      def create(values = OPTS, &block)
        new(values, &block).save
      end
  
      # Returns the dataset associated with the Model class.  Raises
      # an +Error+ if there is no associated dataset for this class.
      # In most cases, you don't need to call this directly, as Model
      # proxies many dataset methods to the underlying dataset.
      #
      #   Artist.dataset.all # SELECT * FROM artists
      def dataset
        @dataset || raise(Error, "No dataset associated with #{self}")
      end

      # Alias of set_dataset
      def dataset=(ds)
        set_dataset(ds)
      end

      # Extend the dataset with a module, similar to adding
      # a plugin with the methods defined in DatasetMethods.
      # This is the recommended way to add methods to model datasets.
      #
      # If given an argument, it should be a module, and is used to extend
      # the underlying dataset.  Otherwise an anonymous module is created, and
      # if a block is given, it is module_evaled, allowing you do define
      # dataset methods directly using the standard ruby def syntax.
      # Returns the module given or the anonymous module created.
      #
      #   # Usage with existing module
      #   Album.dataset_module Sequel::ColumnsIntrospection
      #
      #   # Usage with anonymous module
      #   Album.dataset_module do
      #     def foo
      #       :bar
      #     end
      #   end
      #   Album.dataset.foo
      #   # => :bar
      #   Album.foo
      #   # => :bar
      #
      # Any anonymous modules created are actually instances of Sequel::Model::DatasetModule
      # (a Module subclass), which allows you to call the subset method on them, which
      # defines a dataset method that adds a filter.  There are also a number of other
      # methods with the same names as the dataset methods, which can use to define
      # named dataset methods:
      #
      #   Album.dataset_module do
      #     where(:released, Sequel[:release_date] <= Sequel::CURRENT_DATE)
      #     order :by_release_date, :release_date
      #     select :for_select_options, :id, :name, :release_date
      #   end
      #   Album.released.sql
      #   # => "SELECT * FROM artists WHERE (release_date <= CURRENT_DATE)"
      #   Album.by_release_date.sql
      #   # => "SELECT * FROM artists ORDER BY release_date"
      #   Album.for_select_options.sql
      #   # => "SELECT id, name, release_date FROM artists"
      #   Album.released.by_release_date.for_select_options.sql
      #   # => "SELECT id, name, release_date FROM artists WHERE (release_date <= CURRENT_DATE) ORDER BY release_date"
      #
      # The following methods are supported: distinct, eager, exclude, exclude_having, grep, group, group_and_count,
      # group_append, having, limit, offset, order, order_append, order_prepend, select, select_all,
      # select_append, select_group, where, and server.
      #
      # The advantage of using these DatasetModule methods to define your dataset
      # methods is that they can take advantage of dataset caching to improve
      # performance.
      #
      # Any public methods in the dataset module will have class methods created that
      # call the method on the dataset, assuming that the class method is not already
      # defined.
      def dataset_module(mod = nil, &block)
        if mod
          raise Error, "can't provide both argument and block to Model.dataset_module" if block
          dataset_extend(mod)
          mod
        else
          @dataset_module ||= dataset_module_class.new(self)
          @dataset_module.module_eval(&block) if block
          dataset_extend(@dataset_module)
          @dataset_module
        end
      end

      # Returns the database associated with the Model class.
      # If this model doesn't have a database associated with it,
      # assumes the superclass's database, or the first object in
      # Sequel::DATABASES.  If no Sequel::Database object has
      # been created, raises an error.
      #
      #   Artist.db.transaction do # BEGIN
      #     Artist.create(name: 'Bob')
      #     # INSERT INTO artists (name) VALUES ('Bob')
      #   end # COMMIT
      def db
        return @db if @db
        @db = self == Model ? Sequel.synchronize{DATABASES.first} : superclass.db
        raise(Error, "No database associated with #{self}: have you called Sequel.connect or #{self}.db= ?") unless @db
        @db
      end
      
      # Sets the database associated with the Model class.
      # Should only be used if the Model class currently does not
      # have a dataset defined.
      #
      # This can be used directly on Sequel::Model to set the default database to be used
      # by subclasses, or to override the database used for specific models:
      #
      #   Sequel::Model.db = DB1
      #   Artist = Class.new(Sequel::Model)
      #   Artist.db = DB2
      #
      # Note that you should not use this to change the model's database
      # at runtime.  If you have that need, you should look into Sequel's
      # sharding support, or consider using separate model classes per Database.
      def db=(db)
        raise Error, "Cannot use Sequel::Model.db= on model with existing dataset.  Use Sequel::Model.dataset= instead." if @dataset
        @db = db
      end
      
      # Returns the cached schema information if available or gets it
      # from the database.  This is a hash where keys are column symbols
      # and values are hashes of information related to the column.  See
      # <tt>Database#schema</tt>.
      #
      #   Artist.db_schema
      #   # {:id=>{:type=>:integer, :primary_key=>true, ...},
      #   #  :name=>{:type=>:string, :primary_key=>false, ...}} 
      def db_schema
        return @db_schema if @db_schema
        return nil if frozen?
        @db_schema = get_db_schema
      end
  
      # Create a column alias, where the column methods have one name, but the underlying storage uses a
      # different name.
      def def_column_alias(meth, column)
        clear_setter_methods_cache
        overridable_methods_module.module_eval do
          define_method(meth){self[column]}
          define_method("#{meth}="){|v| self[column] = v}
        end
      end
  
      # Finds a single record according to the supplied filter.
      # You are encouraged to use Model.[] or Model.first instead of this method.
      #
      #   Artist.find(name: 'Bob')
      #   # SELECT * FROM artists WHERE (name = 'Bob') LIMIT 1
      #
      #   Artist.find{name > 'M'}
      #   # SELECT * FROM artists WHERE (name > 'M') LIMIT 1
      def find(*args, &block)
        first(*args, &block)
      end
      
      # Like +find+ but invokes create with given conditions when record does not
      # exist.  Unlike +find+ in that the block used in this method is not passed
      # to +find+, but instead is passed to +create+ only if +find+ does not
      # return an object.
      #
      #   Artist.find_or_create(name: 'Bob')
      #   # SELECT * FROM artists WHERE (name = 'Bob') LIMIT 1
      #   # INSERT INTO artists (name) VALUES ('Bob')
      #
      #   Artist.find_or_create(name: 'Jim'){|a| a.hometown = 'Sactown'}
      #   # SELECT * FROM artists WHERE (name = 'Jim') LIMIT 1
      #   # INSERT INTO artists (name, hometown) VALUES ('Jim', 'Sactown')
      def find_or_create(cond, &block)
        find(cond) || create(cond, &block)
      end

      # Freeze a model class, disallowing any further changes to it.
      def freeze
        return self if frozen?
        dataset_module.freeze
        overridable_methods_module.freeze

        if @dataset
          db_schema.freeze.each_value(&:freeze)
          columns.freeze
          setter_methods.freeze
        else
          @setter_methods = [].freeze
        end

        @dataset_method_modules.freeze
        @default_set_fields_options.freeze
        @plugins.freeze

        super
      end

      # Whether the model has a dataset.  True for most model classes,
      # but can be false if the model class is an abstract model class
      # designed for subclassing, such as Sequel::Model itself.
      def has_dataset?
        !@dataset.nil?
      end

      # Clear the setter_methods cache when a module is included, as it
      # may contain setter methods.
      def include(*mods)
        clear_setter_methods_cache
        super
      end

      # If possible, set the dataset for the model subclass as soon as it
      # is created.  Also, make sure the inherited class instance variables
      # are copied into the subclass.
      #
      # Sequel queries the database to get schema information as soon as
      # a model class is created:
      #
      #   class Artist < Sequel::Model # Causes schema query
      #   end
      def inherited(subclass)
        super
        ivs = subclass.instance_variables
        inherited_instance_variables.each do |iv, dup|
          next if ivs.include?(iv)
          if (sup_class_value = instance_variable_get(iv)) && dup
            sup_class_value = case dup
            when :dup
              sup_class_value.dup
            when :hash_dup
              h = {}
              sup_class_value.each{|k,v| h[k] = v.dup}
              h
            when Proc
              dup.call(sup_class_value)
            else
              raise Error, "bad inherited instance variable type: #{dup.inspect}"
            end
          end
          subclass.instance_variable_set(iv, sup_class_value)
        end

        unless ivs.include?(:@dataset)
          if @dataset && self != Model
            subclass.set_dataset(@dataset.clone, :inherited=>true)
          elsif (n = subclass.name) && !n.to_s.empty?
            db
            subclass.set_dataset(subclass.implicit_table_name)
          end
        end
      end

      # Returns the implicit table name for the model class, which is the demodulized,
      # underscored, pluralized name of the class.
      #
      #   Artist.implicit_table_name # => :artists
      #   Foo::ArtistAlias.implicit_table_name # => :artist_aliases
      def implicit_table_name
        pluralize(underscore(demodulize(name))).to_sym
      end
  
      # Calls #call with the values hash.
      def load(values)
        call(values)
      end

      # Clear the setter_methods cache when a setter method is added.
      def method_added(meth)
        clear_setter_methods_cache if meth.to_s.end_with?('=')
        super
      end
  
      # Mark the model as not having a primary key. Not having a primary key
      # can cause issues, among which is that you won't be able to update records.
      #
      #   Artist.primary_key # => :id
      #   Artist.no_primary_key
      #   Artist.primary_key # => nil
      def no_primary_key
        clear_setter_methods_cache
        self.simple_pk = @primary_key = nil
      end
      
      # Loads a plugin for use with the model class, passing optional arguments
      # to the plugin.  If the plugin is a module, load it directly.  Otherwise,
      # require the plugin from sequel/plugins/#{plugin} and then attempt to load
      # the module using a the camelized plugin name under Sequel::Plugins.
      def plugin(plugin, *args, &block)
        m = plugin.is_a?(Module) ? plugin : plugin_module(plugin)
        unless @plugins.include?(m)
          @plugins << m
          m.apply(self, *args, &block) if m.respond_to?(:apply)
          extend(m::ClassMethods) if m.const_defined?(:ClassMethods, false)
          include(m::InstanceMethods) if m.const_defined?(:InstanceMethods, false)
          if m.const_defined?(:DatasetMethods, false)
            dataset_extend(m::DatasetMethods, :create_class_methods=>false)
          end
        end
        m.configure(self, *args, &block) if m.respond_to?(:configure)
      end

      # Returns primary key attribute hash.  If using a composite primary key
      # value such be an array with values for each primary key in the correct
      # order.  For a standard primary key, value should be an object with a
      # compatible type for the key.  If the model does not have a primary key,
      # raises an +Error+.
      #
      #   Artist.primary_key_hash(1) # => {:id=>1}
      #   Artist.primary_key_hash([1, 2]) # => {:id1=>1, :id2=>2}
      def primary_key_hash(value)
        case key = @primary_key
        when Symbol
          {key => value}
        when Array
          hash = {}
          key.zip(Array(value)){|k,v| hash[k] = v}
          hash
        else
          raise(Error, "#{self} does not have a primary key")
        end
      end

      # Return a hash where the keys are qualified column references.  Uses the given
      # qualifier if provided, or the table_name otherwise. This is useful if you
      # plan to join other tables to this table and you want the column references
      # to be qualified.
      #
      #   Artist.where(Artist.qualified_primary_key_hash(1))
      #   # SELECT * FROM artists WHERE (artists.id = 1)
      def qualified_primary_key_hash(value, qualifier=table_name)
        case key = @primary_key
        when Symbol
          {SQL::QualifiedIdentifier.new(qualifier, key) => value}
        when Array
          hash = {}
          key.zip(Array(value)){|k,v| hash[SQL::QualifiedIdentifier.new(qualifier, k)] = v}
          hash
        else
          raise(Error, "#{self} does not have a primary key")
        end
      end
  
      # Restrict the setting of the primary key(s) when using mass assignment (e.g. +set+).  Because
      # this is the default, this only make sense to use in a subclass where the
      # parent class has used +unrestrict_primary_key+.
      def restrict_primary_key
        clear_setter_methods_cache
        @restrict_primary_key = true
      end
  
      # Whether or not setting the primary key(s) when using mass assignment (e.g. +set+) is
      # restricted, true by default.
      def restrict_primary_key?
        @restrict_primary_key
      end
  
      # Sets the dataset associated with the Model class. +ds+ can be a +Symbol+,
      # +LiteralString+, <tt>SQL::Identifier</tt>, <tt>SQL::QualifiedIdentifier</tt>,
      # <tt>SQL::AliasedExpression</tt>
      # (all specifying a table name in the current database), or a +Dataset+.
      # If a dataset is used, the model's database is changed to the database of the given
      # dataset.  If a dataset is not used, a dataset is created from the current
      # database with the table name given. Other arguments raise an +Error+.
      # Returns self.
      #
      # It also attempts to determine the database schema for the model,
      # based on the given dataset.
      #
      # Note that you should not use this to change the model's dataset
      # at runtime.  If you have that need, you should look into Sequel's
      # sharding support, or creating a separate Model class per dataset
      #
      # You should avoid calling this method directly if possible.  Instead you should
      # set the table name or dataset when creating the model class:
      #
      #   # table name
      #   class Artist < Sequel::Model(:tbl_artists)
      #   end
      #
      #   # dataset
      #   class Artist < Sequel::Model(DB[:tbl_artists])
      #   end
      def set_dataset(ds, opts=OPTS)
        inherited = opts[:inherited]
        @dataset = convert_input_dataset(ds)
        @require_modification = @dataset.provides_accurate_rows_matched? if require_modification.nil?
        if inherited
          self.simple_table = superclass.simple_table
          @columns = superclass.instance_variable_get(:@columns)
          @db_schema = superclass.instance_variable_get(:@db_schema)
        else
          @dataset = @dataset.with_extend(*@dataset_method_modules.reverse) if @dataset_method_modules
          @db_schema = get_db_schema
        end

        reset_instance_dataset
        self
      end

      # Sets the primary key for this model. You can use either a regular 
      # or a composite primary key.  To not use a primary key, set to nil
      # or use +no_primary_key+. On most adapters, Sequel can automatically
      # determine the primary key to use, so this method is not needed often.
      #
      #   class Person < Sequel::Model
      #     # regular key
      #     set_primary_key :person_id
      #   end
      #
      #   class Tagging < Sequel::Model
      #     # composite key
      #     set_primary_key [:taggable_id, :tag_id]
      #   end
      def set_primary_key(key)
        clear_setter_methods_cache
        if key.is_a?(Array)
          if key.length < 2
            key = key.first
          else
            key = key.dup.freeze
          end
        end
        self.simple_pk = if key && !key.is_a?(Array)
          (@dataset || db).literal(key).freeze
        end
        @primary_key = key
      end
  
      # Cache of setter methods to allow by default, in order to speed up mass assignment.
      def setter_methods
        return @setter_methods if @setter_methods
        @setter_methods = get_setter_methods
      end

      # Returns name of primary table for the dataset. If the table for the dataset
      # is aliased, returns the aliased name.
      #
      #   Artist.table_name # => :artists
      #   Sequel::Model(:foo).table_name # => :foo
      #   Sequel::Model(Sequel[:foo].as(:bar)).table_name # => :bar
      def table_name
        dataset.first_source_alias
      end
  
      # Allow the setting of the primary key(s) when using the mass assignment methods.
      # Using this method can open up security issues, be very careful before using it.
      #
      #   Artist.set(id: 1) # Error
      #   Artist.unrestrict_primary_key
      #   Artist.set(id: 1) # No Error
      def unrestrict_primary_key
        clear_setter_methods_cache
        @restrict_primary_key = false
      end

      # Return the model instance with the primary key, or nil if there is no matching record.
      def with_pk(pk)
        primary_key_lookup(pk)
      end

      # Return the model instance with the primary key, or raise NoMatchingRow if there is no matching record.
      def with_pk!(pk)
        with_pk(pk) || raise(NoMatchingRow.new(dataset))
      end
  
      # Add model methods that call dataset methods
      Plugins.def_dataset_methods(self, (Dataset::ACTION_METHODS + Dataset::QUERY_METHODS + [:each_server]) - [:<<, :or, :[], :columns, :columns!, :delete, :update, :set_graph_aliases, :add_graph_aliases])
  
      private
      
      # Yield to the passed block and if do_raise is false, swallow all errors other than DatabaseConnectionErrors.
      def check_non_connection_error(do_raise=require_valid_table)
        begin
          db.transaction(:savepoint=>:only){yield}
        rescue Sequel::DatabaseConnectionError
          raise
        rescue Sequel::Error
          raise if do_raise
        end
      end

      # Convert the given object to a Dataset that should be used as
      # this model's dataset.
      def convert_input_dataset(ds)
        case ds
        when Symbol, SQL::Identifier, SQL::QualifiedIdentifier, SQL::AliasedExpression, LiteralString
          self.simple_table = db.literal(ds).freeze
          ds = db.from(ds)
        when Dataset
          ds = ds.from_self(:alias=>ds.first_source) if ds.joined_dataset?

          self.simple_table = if ds.send(:simple_select_all?)
            ds.literal(ds.first_source_table).freeze
          end
          @db = ds.db
        else
          raise(Error, "Model.set_dataset takes one of the following classes as an argument: Symbol, LiteralString, SQL::Identifier, SQL::QualifiedIdentifier, SQL::AliasedExpression, Dataset")
        end

        set_dataset_row_proc(ds.clone(:model=>self))
      end

      # Add the module to the class's dataset_method_modules.  Extend the dataset with the
      # module if the model has a dataset.  Add dataset methods to the class for all
      # public dataset methods.
      def dataset_extend(mod, opts=OPTS)
        @dataset = @dataset.with_extend(mod) if @dataset
        reset_instance_dataset
        dataset_method_modules << mod
        unless opts[:create_class_methods] == false
          mod.public_instance_methods.each{|meth| def_model_dataset_method(meth)}
        end
      end

      # Create a column accessor for a column with a method name that is hard to use in ruby code.
      def def_bad_column_accessor(column)
        im = instance_methods
        overridable_methods_module.module_eval do
          meth = :"#{column}="
          define_method(column){self[column]} unless im.include?(column)
          define_method(meth){|v| self[column] = v} unless im.include?(meth)
        end
      end
  
      # Create the column accessors.  For columns that can be used as method names directly in ruby code,
      # use a string to define the method for speed.  For other columns names, use a block.
      def def_column_accessor(*columns)
        clear_setter_methods_cache
        columns, bad_columns = columns.partition{|x| /\A[A-Za-z_][A-Za-z0-9_]*\z/.match(x.to_s)}
        bad_columns.each{|x| def_bad_column_accessor(x)}
        im = instance_methods
        columns.each do |column|
          meth = :"#{column}="
          overridable_methods_module.module_eval("def #{column}; self[:#{column}] end", __FILE__, __LINE__) unless im.include?(column)
          overridable_methods_module.module_eval("def #{meth}(v); self[:#{column}] = v end", __FILE__, __LINE__) unless im.include?(meth)
        end
      end
  
      # Define a model method that calls the dataset method with the same name,
      # only used for methods with names that can't be represented directly in
      # ruby code.
      def def_model_dataset_method(meth)
        return if respond_to?(meth, true)

        if meth.to_s =~ /\A[A-Za-z_][A-Za-z0-9_]*\z/
          instance_eval("def #{meth}(*args, &block); dataset.#{meth}(*args, &block) end", __FILE__, __LINE__)
        else
          define_singleton_method(meth){|*args, &block| dataset.public_send(meth, *args, &block)}
        end
      end

      # Get the schema from the database, fall back on checking the columns
      # via the database if that will return inaccurate results or if
      # it raises an error.
      def get_db_schema(reload = reload_db_schema?)
        set_columns(nil)
        return nil unless @dataset
        schema_hash = {}
        ds_opts = dataset.opts
        get_columns = proc{check_non_connection_error{columns} || []}
        schema_array = check_non_connection_error(false){db.schema(dataset, :reload=>reload)} if db.supports_schema_parsing?
        if schema_array
          schema_array.each{|k,v| schema_hash[k] = v}

          # Set the primary key(s) based on the schema information,
          # if the schema information includes primary key information
          if schema_array.all?{|k,v| v.has_key?(:primary_key)}
            pks = schema_array.map{|k,v| k if v[:primary_key]}.compact
            pks.length > 0 ? set_primary_key(pks) : no_primary_key
          end

          if (select = ds_opts[:select]) && !(select.length == 1 && select.first.is_a?(SQL::ColumnAll))
            # We don't remove the columns from the schema_hash,
            # as it's possible they will be used for typecasting
            # even if they are not selected.
            cols = get_columns.call
            cols.each{|c| schema_hash[c] ||= {}}
            def_column_accessor(*schema_hash.keys)
          else
            # Dataset is for a single table with all columns,
            # so set the columns based on the order they were
            # returned by the schema.
            cols = schema_array.map{|k,v| k}
            set_columns(cols)
            # Also set the columns for the dataset, so the dataset
            # doesn't have to do a query to get them.
            dataset.send(:columns=, cols)
          end
        else
          # If the dataset uses multiple tables or custom sql or getting
          # the schema raised an error, just get the columns and
          # create an empty schema hash for it.
          get_columns.call.each{|c| schema_hash[c] = {}}
        end
        schema_hash
      end

      # Uncached version of setter_methods, to be overridden by plugins
      # that want to modify the methods used.
      def get_setter_methods
        meths = instance_methods.map(&:to_s).select{|l| l.end_with?('=')} - RESTRICTED_SETTER_METHODS
        meths -= Array(primary_key).map{|x| "#{x}="} if primary_key && restrict_primary_key?
        meths
      end
  
      # A hash of instance variables to automatically set up in subclasses.
      # Keys are instance variable symbols, values should be:
      # nil :: Assign directly from superclass to subclass (frozen objects)
      # :dup :: Dup object when assigning from superclass to subclass (mutable objects)
      # :hash_dup :: Assign hash with same keys, but dup all the values
      # Proc :: Call with subclass to do the assignment
      def inherited_instance_variables
        {
          :@cache_anonymous_models=>nil,
          :@dataset_method_modules=>:dup,
          :@dataset_module_class=>nil,
          :@db=>nil,
          :@default_set_fields_options=>:dup,
          :@fast_instance_delete_sql=>nil,
          :@fast_pk_lookup_sql=>nil,
          :@plugins=>:dup,
          :@primary_key=>nil,
          :@raise_on_save_failure=>nil,
          :@raise_on_typecast_failure=>nil,
          :@require_modification=>nil,
          :@require_valid_table=>nil,
          :@restrict_primary_key=>nil,
          :@setter_methods=>nil,
          :@simple_pk=>nil,
          :@simple_table=>nil,
          :@strict_param_setting=>nil,
          :@typecast_empty_string_to_nil=>nil,
          :@typecast_on_assignment=>nil,
          :@use_transactions=>nil
        }
      end
    
      # For the given opts hash and default name or :class option, add a
      # :class_name option unless already present which contains the name
      # of the class to use as a string.  The purpose is to allow late
      # binding to the class later using constantize.
      def late_binding_class_option(opts, default)
        case opts[:class]
          when String, Symbol
            # Delete :class to allow late binding
            class_name = opts.delete(:class).to_s

            if (namespace = opts[:class_namespace]) && !class_name.start_with?('::')
              class_name = "::#{namespace}::#{class_name}"
            end

            opts[:class_name] ||= class_name
          when Class
            opts[:class_name] ||= opts[:class].name
        end

        opts[:class_name] ||= '::' + ((name || '').split("::")[0..-2] + [camelize(default)]).join('::')
      end
  
      # Module that the class includes that holds methods the class adds for column accessors and
      # associations so that the methods can be overridden with +super+.
      def overridable_methods_module
        include(@overridable_methods_module = Module.new) unless @overridable_methods_module
        @overridable_methods_module
      end
      
      # Returns the module for the specified plugin. If the module is not 
      # defined, the corresponding plugin required.
      def plugin_module(plugin)
        module_name = plugin.to_s.gsub(/(^|_)(.)/){|x| x[-1..-1].upcase}
        unless Sequel::Plugins.const_defined?(module_name, false)
          require "sequel/plugins/#{plugin}"
        end
        Sequel::Plugins.const_get(module_name)
      end

      # Find the row in the dataset that matches the primary key.  Uses
      # a static SQL optimization if the table and primary key are simple.
      #
      # This method should not be called with a nil primary key, in case
      # it is overridden by plugins which assume that the passed argument
      # is valid.
      def primary_key_lookup(pk)
        if sql = @fast_pk_lookup_sql
          sql = sql.dup
          ds = dataset
          ds.literal_append(sql, pk)
          ds.fetch_rows(sql){|r| return ds.row_proc.call(r)}
          nil
        else
          dataset.first(primary_key_hash(pk))
        end
      end

      # Whether to reload the database schema by default, ignoring any cached value.
      def reload_db_schema?
        false
      end
      
      # Reset the cached fast primary lookup SQL if a simple table and primary key
      # are used, or set it to nil if not used.
      def reset_fast_pk_lookup_sql
        @fast_pk_lookup_sql = if @simple_table && @simple_pk
          "SELECT * FROM #{@simple_table} WHERE #{@simple_pk} = ".freeze
        end
        @fast_instance_delete_sql = if @simple_table && @simple_pk
          "DELETE FROM #{@simple_table} WHERE #{@simple_pk} = ".freeze
        end
      end

      # Reset the instance dataset to a modified copy of the current dataset,
      # should be used whenever the model's dataset is modified.
      def reset_instance_dataset
        @instance_dataset = @dataset.limit(1).naked.skip_limit_check if @dataset
      end
  
      # Set the columns for this model and create accessor methods for each column.
      def set_columns(new_columns)
        @columns = new_columns
        def_column_accessor(*new_columns) if new_columns
        @columns
      end

      # Set the dataset's row_proc to the current model.
      def set_dataset_row_proc(ds)
        ds.with_row_proc(self)
      end

      # Reset the fast primary key lookup SQL when the simple_pk value changes.
      def simple_pk=(pk)
        @simple_pk = pk
        reset_fast_pk_lookup_sql
      end

      # Reset the fast primary key lookup SQL when the simple_table value changes.
      def simple_table=(t)
        @simple_table = t
        reset_fast_pk_lookup_sql
      end

      # Returns a copy of the model's dataset with custom SQL
      #
      #   Artist.fetch("SELECT * FROM artists WHERE name LIKE 'A%'")
      #   Artist.fetch("SELECT * FROM artists WHERE id = ?", 1)
      alias fetch with_sql
    end

    # Sequel::Model instance methods that implement basic model functionality.
    #
    # * All of the model before/after/around hooks are implemented as instance methods that are called
    #   by Sequel when the appropriate action occurs.  For example, when destroying
    #   a model object, Sequel will call +around_destroy+, which will call +before_destroy+, do
    #   the destroy, and then call +after_destroy+.
    # * The following instance_methods all call the class method of the same
    #   name: columns, db, primary_key, db_schema.
    # * The following accessor methods are defined via metaprogramming:
    #   raise_on_save_failure, raise_on_typecast_failure, require_modification,
    #   strict_param_setting, typecast_empty_string_to_nil, typecast_on_assignment,
    #   and use_transactions.  The setter methods will change the setting for the
    #   instance, and the getter methods will check for an instance setting, then
    #   try the class setting if no instance setting has been set.
    module InstanceMethods
      HOOKS.each{|h| class_eval("def #{h}; end", __FILE__, __LINE__)}
      [:around_create, :around_update, :around_save, :around_destroy, :around_validation].each{|h| class_eval("def #{h}; yield end", __FILE__, __LINE__)}

      # Define instance method(s) that calls class method(s) of the
      # same name. Replaces the construct:
      #   
      #   define_method(meth){self.class.public_send(meth)}
      [:columns, :db, :primary_key, :db_schema].each{|meth| class_eval("def #{meth}; self.class.#{meth} end", __FILE__, __LINE__)}

      # Define instance method(s) that calls class method(s) of the
      # same name, caching the result in an instance variable.  Define
      # standard attr_writer method for modifying that instance variable.
      [:typecast_empty_string_to_nil, :typecast_on_assignment, :strict_param_setting, 
        :raise_on_save_failure, :raise_on_typecast_failure, :require_modification, :use_transactions].each do |meth|
        class_eval("def #{meth}; !defined?(@#{meth}) ? (frozen? ? self.class.#{meth} : (@#{meth} = self.class.#{meth})) : @#{meth} end", __FILE__, __LINE__)
        attr_writer(meth)
      end

      # The hash of attribute values.  Keys are symbols with the names of the
      # underlying database columns. The returned hash is a reference to the
      # receiver's values hash, and modifying it will also modify the receiver's
      # values.
      #
      #   Artist.new(name: 'Bob').values # => {:name=>'Bob'}
      #   Artist[1].values # => {:id=>1, :name=>'Jim', ...}
      attr_reader :values
      alias to_hash values

      # Get the value of the column.  Takes a single symbol or string argument.
      # By default it calls send with the argument to get the value.  This can
      # be overridden if you have columns that conflict with existing
      # method names.
      alias get_column_value send

      # Set the value of the column.  Takes two arguments.  The first is a
      # symbol or string argument for the column name, suffixed with =.  The
      # second is the value to set for the column.  By default it calls send
      # with the argument to set the value.  This can be overridden if you have
      # columns that conflict with existing method names (unlikely for setter
      # methods, but possible).
      alias set_column_value send

      # Creates new instance and passes the given values to set.
      # If a block is given, yield the instance to the block.
      #
      # Arguments:
      # values :: should be a hash to pass to set. 
      #
      #   Artist.new(name: 'Bob')
      #
      #   Artist.new do |a|
      #     a.name = 'Bob'
      #   end
      def initialize(values = OPTS)
        @values = {}
        @new = true
        @modified = true
        initialize_set(values)
        _clear_changed_columns(:initialize)
        yield self if block_given?
      end

      # Returns value of the column's attribute.
      #
      #   Artist[1][:id] #=> 1
      def [](column)
        @values[column]
      end
  
      # Sets the value for the given column.  If typecasting is enabled for
      # this object, typecast the value based on the column's type.
      # If this is a new record or the typecasted value isn't the same
      # as the current value for the column, mark the column as changed.
      #
      #   a = Artist.new
      #   a[:name] = 'Bob'
      #   a.values #=> {:name=>'Bob'}
      def []=(column, value)
        # If it is new, it doesn't have a value yet, so we should
        # definitely set the new value.
        # If the column isn't in @values, we can't assume it is
        # NULL in the database, so assume it has changed.
        v = typecast_value(column, value)
        vals = @values
        if new? || !vals.include?(column) || v != (c = vals[column]) || v.class != c.class
          change_column_value(column, v)
        end
      end
  
      # Alias of eql?
      def ==(obj)
        eql?(obj)
      end
  
      # Case equality.  By default, checks equality of the primary key value, see
      # pk_equal?.
      #
      #   Artist[1] === Artist[1] # => true
      #   Artist.new === Artist.new # => false
      #   Artist[1].set(:name=>'Bob') === Artist[1] # => true
      def ===(obj)
        case pkv = pk
        when nil
          return false
        when Array
          return false if pk.any?(&:nil?)
        end

        (obj.class == model) && (obj.pk == pkv)
      end

      # If the receiver has a primary key value, returns true if the objects have
      # the same class and primary key value.
      # If the receiver's primary key value is nil or is an array containing
      # nil, returns false.
      #
      #   Artist[1].pk_equal?(Artist[1]) # => true
      #   Artist.new.pk_equal?(Artist.new) # => false
      #   Artist[1].set(:name=>'Bob').pk_equal?(Artist[1]) # => true
      alias pk_equal? ===

      # class is defined in Object, but it is also a keyword,
      # and since a lot of instance methods call class methods,
      # this alias makes it so you can use model instead of
      # self.class.
      #
      #   Artist.new.model # => Artist
      alias_method :model, :class

      # The autoincrementing primary key for this model object. Should be
      # overridden if you have a composite primary key with one part of it
      # being autoincrementing.
      def autoincrementing_primary_key
        primary_key
      end

      # Cancel the current action.  Should be called in before hooks to halt
      # the processing of the action.  If a +msg+ argument is given and
      # the model instance is configured to raise exceptions on failure,
      # sets the message to use for the raised HookFailed exception.
      def cancel_action(msg=nil)
        raise_hook_failure(msg)
      end
  
      # The columns that have been updated.  This isn't completely accurate,
      # as it could contain columns whose values have not changed.
      #
      #   a = Artist[1]
      #   a.changed_columns # => []
      #   a.name = 'Bob'
      #   a.changed_columns # => [:name]
      def changed_columns
        _changed_columns
      end

      # Deletes and returns +self+.  Does not run destroy hooks.
      # Look into using +destroy+ instead.
      #
      #   Artist[1].delete # DELETE FROM artists WHERE (id = 1)
      #   # => #<Artist {:id=>1, ...}>
      def delete
        raise Sequel::Error, "can't delete frozen object" if frozen?
        _delete
        self
      end
      
      # Like delete but runs hooks before and after delete.
      # Uses a transaction if use_transactions is true or if the
      # :transaction option is given and true.
      #
      #   Artist[1].destroy # BEGIN; DELETE FROM artists WHERE (id = 1); COMMIT;
      #   # => #<Artist {:id=>1, ...}>
      def destroy(opts = OPTS)
        raise Sequel::Error, "can't destroy frozen object" if frozen?
        checked_save_failure(opts){checked_transaction(opts){_destroy(opts)}}
      end

      # Iterates through all of the current values using each.
      #
      #  Album[1].each{|k, v| puts "#{k} => #{v}"}
      #  # id => 1
      #  # name => 'Bob'
      def each(&block)
        @values.each(&block)
      end
  
      # Compares model instances by values.
      #
      #   Artist[1] == Artist[1] # => true
      #   Artist.new == Artist.new # => true
      #   Artist[1].set(:name=>'Bob') == Artist[1] # => false
      def eql?(obj)
        (obj.class == model) && (obj.values == @values)
      end

      # Returns the validation errors associated with this object.
      # See +Errors+.
      def errors
        @errors ||= errors_class.new
      end 

      # Returns true when current instance exists, false otherwise.
      # Generally an object that isn't new will exist unless it has
      # been deleted.  Uses a database query to check for existence,
      # unless the model object is new, in which case this is always
      # false.
      #
      #   Artist[1].exists? # SELECT 1 FROM artists WHERE (id = 1)
      #   # => true
      #   Artist.new.exists?
      #   # => false
      def exists?
        new? ? false : !this.get(SQL::AliasedExpression.new(1, :one)).nil?
      end
      
      # Ignore the model's setter method cache when this instances extends a module, as the
      # module may contain setter methods.
      def extend(mod)
        @singleton_setter_added = true
        super
      end

      # Freeze the object in such a way that it is still usable but not modifiable.
      # Once an object is frozen, you cannot modify it's values, changed_columns,
      # errors, or dataset.
      def freeze
        values.freeze
        _changed_columns.freeze
        unless errors.frozen?
          validate
          errors.freeze
        end
        this if !new? && model.primary_key
        super
      end
  
      # Value that should be unique for objects with the same class and pk (if pk is not nil), or
      # the same class and values (if pk is nil).
      #
      #   Artist[1].hash == Artist[1].hash # true
      #   Artist[1].set(name: 'Bob').hash == Artist[1].hash # true
      #   Artist.new.hash == Artist.new.hash # true
      #   Artist.new(name: 'Bob').hash == Artist.new.hash # false
      def hash
        case primary_key
        when Array
          [model, !pk.all? ? @values : pk].hash
        when Symbol
          [model, pk.nil? ? @values : pk].hash
        else
          [model, @values].hash
        end
      end
  
      # Returns value for the :id attribute, even if the primary key is
      # not id. To get the primary key value, use +pk+.
      #
      #   Artist[1].id # => 1
      def id
        @values[:id]
      end
  
      # Returns a string representation of the model instance including
      # the class name and values.
      def inspect
        "#<#{model.name} @values=#{inspect_values}>"
      end
  
      # Returns the keys in +values+.  May not include all column names.
      #
      #   Artist.new.keys # => []
      #   Artist.new(name: 'Bob').keys # => [:name]
      #   Artist[1].keys # => [:id, :name]
      def keys
        @values.keys
      end
      
      # Refresh this record using +for_update+ (by default, or the specified style when given)
      # unless this is a new record.  Returns self. This can be used to make sure no other
      # process is updating the record at the same time.
      #
      # If style is a string, it will be used directly. You should never pass a string
      # to this method that is derived from user input, as that can lead to
      # SQL injection.
      #
      # A symbol may be used for database independent locking behavior, but
      # all supported symbols have separate methods (e.g. for_update).
      #
      #
      #   a = Artist[1]
      #   Artist.db.transaction do
      #     a.lock!
      #     a.update(:name=>'A')
      #   end
      #
      #   a = Artist[2]
      #   Artist.db.transaction do
      #     a.lock!('FOR NO KEY UPDATE')
      #     a.update(:name=>'B')
      #   end
      def lock!(style=:update)
        _refresh(this.lock_style(style)) unless new?
        self
      end
      
      # Remove elements of the model object that make marshalling fail. Returns self.
      #
      #   a = Artist[1]
      #   a.marshallable!
      #   Marshal.dump(a)
      def marshallable!
        @this = nil
        self
      end

      # Explicitly mark the object as modified, so +save_changes+/+update+ will
      # run callbacks even if no columns have changed.
      #
      #   a = Artist[1]
      #   a.save_changes # No callbacks run, as no changes
      #   a.modified!
      #   a.save_changes # Callbacks run, even though no changes made
      #
      # If a column is given, specifically marked that column as modified,
      # so that +save_changes+/+update+ will include that column in the
      # update. This should be used if you plan on mutating the column
      # value instead of assigning a new column value:
      #
      #   a.modified!(:name)
      #   a.name.gsub!(/[aeou]/, 'i')
      def modified!(column=nil)
        _add_changed_column(column) if column
        @modified = true
      end

      # Whether this object has been modified since last saved, used by
      # save_changes to determine whether changes should be saved.  New
      # values are always considered modified.
      #
      #   a = Artist[1]
      #   a.modified? # => false
      #   a.set(name: 'Jim')
      #   a.modified? # => true
      #
      # If a column is given, specifically check if the given column has
      # been modified:
      #
      #   a.modified?(:num_albums) # => false
      #   a.num_albums = 10
      #   a.modified?(:num_albums) # => true
      def modified?(column=nil)
        if column
          changed_columns.include?(column)
        else
          @modified || !changed_columns.empty?
        end
      end
  
      # Returns true if the current instance represents a new record.
      #
      #   Artist.new.new? # => true
      #   Artist[1].new? # => false
      def new?
        defined?(@new) ? @new : (@new = false)
      end
      
      # Returns the primary key value identifying the model instance.
      # Raises an +Error+ if this model does not have a primary key.
      # If the model has a composite primary key, returns an array of values.
      #
      #   Artist[1].pk # => 1
      #   Artist[[1, 2]].pk # => [1, 2]
      def pk
        raise(Error, "No primary key is associated with this model") unless key = primary_key
        if key.is_a?(Array)
          vals = @values
          key.map{|k| vals[k]}
        else
          @values[key]
        end
      end
      
      # Returns a hash mapping the receivers primary key column(s) to their values.
      # 
      #   Artist[1].pk_hash # => {:id=>1}
      #   Artist[[1, 2]].pk_hash # => {:id1=>1, :id2=>2}
      def pk_hash
        model.primary_key_hash(pk)
      end
      
      # Returns a hash mapping the receivers qualified primary key column(s) to their values.
      # 
      #   Artist[1].qualified_pk_hash
      #   # => {Sequel[:artists][:id]=>1}
      #   Artist[[1, 2]].qualified_pk_hash
      #   # => {Sequel[:artists][:id1]=>1, Sequel[:artists][:id2]=>2}
      def qualified_pk_hash(qualifier=model.table_name)
        model.qualified_primary_key_hash(pk, qualifier)
      end
      
      # Reloads attributes from database and returns self. Also clears all
      # changed_columns information.  Raises an +Error+ if the record no longer
      # exists in the database.
      #
      #   a = Artist[1]
      #   a.name = 'Jim'
      #   a.refresh
      #   a.name # => 'Bob'
      def refresh
        raise Sequel::Error, "can't refresh frozen object" if frozen?
        _refresh(this)
        self
      end

      # Alias of refresh, but not aliased directly to make overriding in a plugin easier.
      def reload
        refresh
      end
  
      # Creates or updates the record, after making sure the record
      # is valid and before hooks execute successfully. Fails if:
      #
      # * the record is not valid, or
      # * before_save calls cancel_action, or
      # * the record is new and before_create calls cancel_action, or
      # * the record is not new and before_update calls cancel_action.
      #
      # If +save+ fails and either raise_on_save_failure or the
      # :raise_on_failure option is true, it raises ValidationFailed
      # or HookFailed. Otherwise it returns nil.
      #
      # If it succeeds, it returns self.
      #
      # Takes the following options:
      #
      # :changed :: save all changed columns, instead of all columns or the columns given
      # :columns :: array of specific columns that should be saved.
      # :raise_on_failure :: set to true or false to override the current
      #                      +raise_on_save_failure+ setting
      # :server :: set the server/shard on the object before saving, and use that
      #            server/shard in any transaction.
      # :transaction :: set to true or false to override the current
      #                 +use_transactions+ setting
      # :validate :: set to false to skip validation
      def save(opts=OPTS)
        raise Sequel::Error, "can't save frozen object" if frozen?
        set_server(opts[:server]) if opts[:server] 
        unless _save_valid?(opts)
          raise(validation_failed_error) if raise_on_failure?(opts)
          return
        end
        checked_save_failure(opts){checked_transaction(opts){_save(opts)}}
      end

      # Saves only changed columns if the object has been modified.
      # If the object has not been modified, returns nil.  If unable to
      # save, returns false unless +raise_on_save_failure+ is true.
      #
      #   a = Artist[1]
      #   a.save_changes # => nil
      #   a.name = 'Jim'
      #   a.save_changes # UPDATE artists SET name = 'Bob' WHERE (id = 1)
      #   # => #<Artist {:id=>1, :name=>'Jim', ...}
      def save_changes(opts=OPTS)
        save(Hash[opts].merge!(:changed=>true)) || false if modified? 
      end
  
      # Updates the instance with the supplied values with support for virtual
      # attributes, raising an exception if a value is used that doesn't have
      # a setter method (or ignoring it if <tt>strict_param_setting = false</tt>).
      # Does not save the record.
      #
      #   artist.set(name: 'Jim')
      #   artist.name # => 'Jim'
      def set(hash)
        set_restricted(hash, :default)
      end
  
      # For each of the fields in the given array +fields+, call the setter
      # method with the value of that +hash+ entry for the field. Returns self.
      #
      # You can provide an options hash, with the following options currently respected:
      # :missing :: Can be set to :skip to skip missing entries or :raise to raise an
      #             Error for missing entries.  The default behavior is not to check for
      #             missing entries, in which case the default value is used.  To be
      #             friendly with most web frameworks, the missing check will also check
      #             for the string version of the argument in the hash if given a symbol.
      #
      # Examples:
      #
      #   artist.set_fields({name: 'Jim'}, [:name])
      #   artist.name # => 'Jim'
      #
      #   artist.set_fields({hometown: 'LA'}, [:name])
      #   artist.name # => nil
      #   artist.hometown # => 'Sac'
      #
      #   artist.name # => 'Jim'
      #   artist.set_fields({}, [:name], missing: :skip)
      #   artist.name # => 'Jim'
      #
      #   artist.name # => 'Jim'
      #   artist.set_fields({}, [:name], missing: :raise)
      #   # Sequel::Error raised
      def set_fields(hash, fields, opts=nil)
        opts = if opts
          model.default_set_fields_options.merge(opts)
        else
          model.default_set_fields_options
        end

        case missing = opts[:missing]
        when :skip, :raise
          do_raise = true if missing == :raise
          fields.each do |f|
            if hash.has_key?(f) 
              set_column_value("#{f}=", hash[f])
            elsif f.is_a?(Symbol) && hash.has_key?(sf = f.to_s)
              set_column_value("#{sf}=", hash[sf])
            elsif do_raise
              raise(Sequel::Error, "missing field in hash: #{f.inspect} not in #{hash.inspect}")
            end
          end
        else
          fields.each{|f| set_column_value("#{f}=", hash[f])}
        end
        self
      end
  
      # Set the shard that this object is tied to.  Returns self.
      def set_server(s)
        @server = s
        @this = @this.server(s) if @this
        self
      end

      # Clear the setter_methods cache when a method is added
      def singleton_method_added(meth)
        @singleton_setter_added = true if meth.to_s.end_with?('=')
        super
      end
  
      # Skip all validation of the object on the next call to #save,
      # including the running of validation hooks. This is designed for
      # and should only be used in cases where #valid? is called before
      # saving and the <tt>validate: false</tt> option cannot be passed to
      # #save.
      def skip_validation_on_next_save!
        @skip_validation_on_next_save = true
      end

      # Returns (naked) dataset that should return only this instance.
      #
      #   Artist[1].this
      #   # SELECT * FROM artists WHERE (id = 1) LIMIT 1
      def this
        return @this if @this
        raise Error, "No dataset for model #{model}" unless ds = model.instance_dataset
        @this = use_server(ds.where(pk_hash))
      end
      
      # Runs #set with the passed hash and then runs save_changes.
      #
      #   artist.update(name: 'Jim') # UPDATE artists SET name = 'Jim' WHERE (id = 1)
      def update(hash)
        update_restricted(hash, :default)
      end
  
      # Update the instance's values by calling set_fields with the arguments, then
      # calls save_changes.
      #
      #   artist.update_fields({name: 'Jim'}, [:name])
      #   # UPDATE artists SET name = 'Jim' WHERE (id = 1)
      #
      #   artist.update_fields({hometown: 'LA'}, [:name])
      #   # UPDATE artists SET name = NULL WHERE (id = 1)
      def update_fields(hash, fields, opts=nil)
        set_fields(hash, fields, opts)
        save_changes
      end

      # Validates the object.  If the object is invalid, errors should be added
      # to the errors attribute.  By default, does nothing, as all models
      # are valid by default.  See the {"Model Validations" guide}[rdoc-ref:doc/validations.rdoc].
      # for details about validation.  Should not be called directly by
      # user code, call <tt>valid?</tt> instead to check if an object
      # is valid.
      def validate
      end

      # Validates the object and returns true if no errors are reported.
      #
      #   artist.set(name: 'Valid').valid? # => true
      #   artist.set(name: 'Invalid').valid? # => false
      #   artist.errors.full_messages # => ['name cannot be Invalid']
      def valid?(opts = OPTS)
        begin
          _valid?(opts)
        rescue HookFailed
          false
        end
      end

      private
      
      # Add a column as a changed column.
      def _add_changed_column(column)
        cc = _changed_columns
        cc << column unless cc.include?(column)
      end

      # Internal changed_columns method that just returns stored array.
      def _changed_columns
        @changed_columns ||= []
      end

      # Clear the changed columns. Reason is the reason for clearing
      # the columns, and should be one of: :initialize, :refresh, :create
      # or :update.
      def _clear_changed_columns(_reason)
        _changed_columns.clear
      end
  
      # Do the deletion of the object's dataset, and check that the row
      # was actually deleted.
      def _delete
        n = _delete_without_checking
        raise(NoExistingObject, "Attempt to delete object did not result in a single row modification (Rows Deleted: #{n}, SQL: #{_delete_dataset.delete_sql})") if require_modification && n != 1
        n
      end
      
      # The dataset to use when deleting the object.  The same as the object's
      # dataset by default.
      def _delete_dataset
        this
      end
  
      # Actually do the deletion of the object's dataset.  Return the
      # number of rows modified.
      def _delete_without_checking
        if sql = (m = model).fast_instance_delete_sql
          sql = sql.dup
          ds = use_server(m.dataset)
          ds.literal_append(sql, pk)
          ds.with_sql_delete(sql)
        else
          _delete_dataset.delete 
        end
      end

      # Internal destroy method, separted from destroy to
      # allow running inside a transaction
      def _destroy(opts)
        called = false
        around_destroy do
          called = true
          before_destroy
          _destroy_delete
          after_destroy
        end
        raise_hook_failure(:around_destroy) unless called
        self
      end
      
      # Internal delete method to call when destroying an object,
      # separated from delete to allow you to override destroy's version
      # without affecting delete.
      def _destroy_delete
        delete
      end

      # Insert the record into the database, returning the primary key if
      # the record should be refreshed from the database.
      def _insert
        ds = _insert_dataset
        if _use_insert_select?(ds) && !(h = _insert_select_raw(ds)).nil?
          _save_set_values(h) if h
          nil
        else
          iid = _insert_raw(ds)
          # if we have a regular primary key and it's not set in @values,
          # we assume it's the last inserted id
          if (pk = autoincrementing_primary_key) && pk.is_a?(Symbol) && !(vals = @values)[pk]
            vals[pk] = iid
          end
          pk
        end
      end

      # The dataset to use when inserting a new object.   The same as the model's
      # dataset by default.
      def _insert_dataset
        use_server(model.instance_dataset)
      end
  
      # Insert into the given dataset and return the primary key created (if any).
      def _insert_raw(ds)
        ds.insert(_insert_values)
      end

      # Insert into the given dataset and return the hash of column values.
      def _insert_select_raw(ds)
        ds.insert_select(_insert_values)
      end

      # The values hash to use when inserting a new record.
      alias _insert_values values
      
      # Refresh using a particular dataset, used inside save to make sure the same server
      # is used for reading newly inserted values from the database
      def _refresh(dataset)
        _refresh_set_values(_refresh_get(dataset) || raise(NoExistingObject, "Record not found"))
        _clear_changed_columns(:refresh)
      end

      # Get the row of column data from the database.
      def _refresh_get(dataset)
        if (sql = model.fast_pk_lookup_sql) && !dataset.opts[:lock]
          sql = sql.dup
          ds = use_server(dataset)
          ds.literal_append(sql, pk)
          ds.with_sql_first(sql)
        else
          dataset.first
        end
      end
      
      # Set the values to the given hash after refreshing.
      def _refresh_set_values(h)
        @values = h
      end

      # Internal version of save, split from save to allow running inside
      # it's own transaction.
      def _save(opts)
        pk = nil
        called_save = false
        called_cu = false
        around_save do
          called_save = true
          before_save

          if new?
            around_create do
              called_cu = true
              before_create
              pk = _insert
              @this = nil
              @new = false
              @modified = false
              pk ? _save_refresh : _clear_changed_columns(:create)
              after_create
              true
            end
            raise_hook_failure(:around_create) unless called_cu
          else
            around_update do
              called_cu = true
              before_update
              columns = opts[:columns]
              if columns.nil?
                if opts[:changed]
                  cc = changed_columns
                  columns_updated = @values.reject{|k,v| !cc.include?(k)}
                  cc.clear
                else
                  columns_updated = _save_update_all_columns_hash
                  _clear_changed_columns(:update)
                end
              else # update only the specified columns
                columns = Array(columns)
                columns_updated = @values.reject{|k, v| !columns.include?(k)}
                _changed_columns.reject!{|c| columns.include?(c)}
              end
              _update_columns(columns_updated)
              @this = nil
              @modified = false
              after_update
              true
            end
            raise_hook_failure(:around_update) unless called_cu
          end
          after_save
          true
        end
        raise_hook_failure(:around_save) unless called_save
        self
      end

      # Refresh the object after saving it, used to get
      # default values of all columns.  Separated from _save so it
      # can be overridden to avoid the refresh.
      def _save_refresh
        _save_set_values(_refresh_get(this.server?(:default)) || raise(NoExistingObject, "Record not found"))
        _clear_changed_columns(:create)
      end

      # Set values to the provided hash.  Called after a create,
      # to set the full values from the database in the model instance.
      def _save_set_values(h)
        @values = h
      end

      # Return a hash of values used when saving all columns of an
      # existing object (i.e. not passing specific columns to save
      # or using update/save_changes).  Defaults to all of the
      # object's values except unmodified primary key columns, as some
      # databases don't like you setting primary key values even
      # to their existing values.
      def _save_update_all_columns_hash
        v = Hash[@values]
        cc = changed_columns
        Array(primary_key).each{|x| v.delete(x) unless cc.include?(x)}
        v
      end

      # Validate the object if validating on save. Skips validation
      # completely (including validation hooks) if
      # skip_validation_on_save! has been called on the object,
      # resetting the flag so that future saves will validate.
      def _save_valid?(opts)
        if @skip_validation_on_next_save
          @skip_validation_on_next_save = false
          return true
        end

        checked_save_failure(opts){_valid?(opts)}
      end

      # Call _update with the given columns, if any are present.
      # Plugins can override this method in order to update with
      # additional columns, even when the column hash is initially empty.
      def _update_columns(columns)
        _update(columns) unless columns.empty?
      end

      # Update this instance's dataset with the supplied column hash,
      # checking that only a single row was modified.
      def _update(columns)
        n = _update_without_checking(columns)
        raise(NoExistingObject, "Attempt to update object did not result in a single row modification (SQL: #{_update_dataset.update_sql(columns)})") if require_modification && n != 1
        n
      end
      
      # The dataset to use when updating an object.  The same as the object's
      # dataset by default.
      def _update_dataset
        this
      end

      # Update this instances dataset with the supplied column hash.
      def _update_without_checking(columns)
        _update_dataset.update(columns)
      end

      # Whether to use insert_select when inserting a new row.
      def _use_insert_select?(ds)
        (!ds.opts[:select] || ds.opts[:returning]) && ds.supports_insert_select? 
      end

      # Internal validation method, running validation hooks.
      def _valid?(opts)
        return errors.empty? if frozen?
        errors.clear
        called = false
        skip_validate = opts[:validate] == false
        around_validation do
          called = true
          before_validation
          validate unless skip_validate
          after_validation
        end

        return true if skip_validate

        if called
          errors.empty?
        else
          raise_hook_failure(:around_validation)
        end
      end

      # If not raising on failure, check for HookFailed
      # being raised by yielding and swallow it.
      def checked_save_failure(opts)
        if raise_on_failure?(opts)
          yield
        else
          begin
            yield
          rescue HookFailed 
            nil
          end
        end
      end
      
      # If transactions should be used, wrap the yield in a transaction block.
      def checked_transaction(opts=OPTS)
        use_transaction?(opts) ? db.transaction({:server=>this_server}.merge!(opts)){yield} : yield
      end

      # Change the value of the column to given value, recording the change.
      def change_column_value(column, value)
        _add_changed_column(column)
        @values[column] = value
      end

      # Default error class used for errors.
      def errors_class
        Errors
      end

      # A HookFailed exception for the given message tied to the current instance.
      def hook_failed_error(msg)
        HookFailed.new(msg, self)
      end
  
      # Clone constructor -- freeze internal data structures if the original's
      # are frozen.
      def initialize_clone(other)
        super
        freeze if other.frozen?
        self
      end

      # Copy constructor -- Duplicate internal data structures.
      def initialize_copy(other)
        super
        @values = Hash[@values]
        @changed_columns = @changed_columns.dup if @changed_columns
        @errors = @errors.dup if @errors
        self
      end

      # Set the columns with the given hash.  By default, the same as +set+, but
      # exists so it can be overridden.  This is called only for new records, before
      # changed_columns is cleared.
      def initialize_set(h)
        set(h) unless h.empty?
      end

      # Default inspection output for the values hash, overwrite to change what #inspect displays.
      def inspect_values
        @values.inspect
      end

      # Whether to raise or return false if this action fails. If the
      # :raise_on_failure option is present in the hash, use that, otherwise,
      # fallback to the object's raise_on_save_failure (if set), or
      # class's default (if not).
      def raise_on_failure?(opts)
        opts.fetch(:raise_on_failure, raise_on_save_failure)
      end

      # Raise an error appropriate to the hook type. May be swallowed by
      # checked_save_failure depending on the raise_on_failure? setting.
      def raise_hook_failure(type=nil)
        msg = case type
        when String
          type
        when Symbol
          "the #{type} hook failed"
        else
          "a hook failed"
        end

        raise hook_failed_error(msg)
      end

      # Get the ruby class or classes related to the given column's type.
      def schema_type_class(column)
        if (sch = db_schema[column]) && (type = sch[:type])
          db.schema_type_class(type)
        end
      end

      # Call setter methods based on keys in hash, with the appropriate values.
      # Restrict which methods can be called based on the provided type.
      def set_restricted(hash, type)
        return self if hash.empty?
        meths = setter_methods(type)
        strict = strict_param_setting
        hash.each do |k,v|
          m = "#{k}="
          if meths.include?(m)
            set_column_value(m, v)
          elsif strict
            # Avoid using respond_to? or creating symbols from user input
            if public_methods.map(&:to_s).include?(m)
              if Array(model.primary_key).map(&:to_s).member?(k.to_s) && model.restrict_primary_key?
                raise MassAssignmentRestriction, "#{k} is a restricted primary key"
              else
                raise MassAssignmentRestriction, "#{k} is a restricted column"
              end
            else
              raise MassAssignmentRestriction, "method #{m} doesn't exist"
            end
          end
        end
        self
      end
      
      # Returns all methods that can be used for attribute assignment (those that end with =),
      # depending on the type:
      #
      # :default :: Use the default methods allowed in the model class. 
      # :all :: Allow setting all setters, except those specifically restricted (such as ==).
      # Array :: Only allow setting of columns in the given array.
      def setter_methods(type)
        if type == :default && !@singleton_setter_added
          return model.setter_methods
        end

        meths = methods.map(&:to_s).select{|l| l.end_with?('=')} - RESTRICTED_SETTER_METHODS
        meths -= Array(primary_key).map{|x| "#{x}="} if primary_key && model.restrict_primary_key?
        meths
      end

      # The server/shard that the model object's dataset uses, or :default if the
      # model object's dataset does not have an associated shard.
      def this_server
        if (s = @server)
          s
        elsif (t = @this)
          t.opts[:server] || :default
        else
          model.dataset.opts[:server] || :default
        end
      end
  
      # Typecast the value to the column's type if typecasting.  Calls the database's
      # typecast_value method, so database adapters can override/augment the handling
      # for database specific column types.
      def typecast_value(column, value)
        return value unless typecast_on_assignment && db_schema && (col_schema = db_schema[column])
        value = nil if '' == value and typecast_empty_string_to_nil and col_schema[:type] and ![:string, :blob].include?(col_schema[:type])
        raise(InvalidValue, "nil/NULL is not allowed for the #{column} column") if raise_on_typecast_failure && value.nil? && (col_schema[:allow_null] == false)
        begin
          model.db.typecast_value(col_schema[:type], value)
        rescue InvalidValue
          raise_on_typecast_failure ? raise : value
        end
      end
  
      # Set the columns, filtered by the only and except arrays.
      def update_restricted(hash, type)
        set_restricted(hash, type)
        save_changes
      end

      # Set the given dataset to use the current object's shard.
      def use_server(ds)
        @server ? ds.server(@server) : ds
      end
      
      # Whether to use a transaction for this action.  If the :transaction
      # option is present in the hash, use that, otherwise, fallback to the
      # object's default (if set), or class's default (if not).
      def use_transaction?(opts = OPTS)
        opts.fetch(:transaction, use_transactions)
      end

      # An ValidationFailed exception instance to raise for this instance.
      def validation_failed_error
        ValidationFailed.new(self)
      end
    end

    # DatasetMethods contains methods that all model datasets have.
    module DatasetMethods
      # The model class associated with this dataset
      #
      #   Artist.dataset.model # => Artist
      def model
        @opts[:model]
      end

      # Assume if a single integer is given that it is a lookup by primary
      # key, and call with_pk with the argument.
      #
      #   Artist.dataset[1] # SELECT * FROM artists WHERE (id = 1) LIMIT 1
      def [](*args)
        if args.length == 1 && (i = args[0]) && i.is_a?(Integer)
          with_pk(i)
        else
          super
        end
      end

      # Destroy each row in the dataset by instantiating it and then calling
      # destroy on the resulting model object.  This isn't as fast as deleting
      # the dataset, which does a single SQL call, but this runs any destroy
      # hooks on each object in the dataset.
      #
      #   Artist.dataset.destroy
      #   # DELETE FROM artists WHERE (id = 1)
      #   # DELETE FROM artists WHERE (id = 2)
      #   # ...
      def destroy
        pr = proc{all(&:destroy).length}
        model.use_transactions ? @db.transaction(:server=>opts[:server], &pr) : pr.call
      end

      # If there is no order already defined on this dataset, order it by
      # the primary key and call last.
      #
      #   Album.last
      #   # SELECT * FROM albums ORDER BY id DESC LIMIT 1
      def last(*a, &block)
        if ds = _primary_key_order
          ds.last(*a, &block)
        else
          super
        end
      end

      # If there is no order already defined on this dataset, order it by
      # the primary key and call paged_each.
      #
      #   Album.paged_each{|row| }
      #   # SELECT * FROM albums ORDER BY id LIMIT 1000 OFFSET 0
      #   # SELECT * FROM albums ORDER BY id LIMIT 1000 OFFSET 1000
      #   # SELECT * FROM albums ORDER BY id LIMIT 1000 OFFSET 2000
      #   # ...
      def paged_each(*a, &block)
        if ds = _primary_key_order
          ds.paged_each(*a, &block)
        else
          super
        end
      end

      # This allows you to call +as_hash+ without any arguments, which will
      # result in a hash with the primary key value being the key and the
      # model object being the value.
      #
      #   Artist.dataset.as_hash # SELECT * FROM artists
      #   # => {1=>#<Artist {:id=>1, ...}>,
      #   #     2=>#<Artist {:id=>2, ...}>,
      #   #     ...}
      def as_hash(key_column=nil, value_column=nil, opts=OPTS)
        if key_column
          super
        else
          raise(Sequel::Error, "No primary key for model") unless model && (pk = model.primary_key)
          super(pk, value_column, opts) 
        end
      end

      # Alias of as_hash for backwards compatibility.
      def to_hash(*a)
        as_hash(*a)
      end

      # Given a primary key value, return the first record in the dataset with that primary key
      # value.  If no records matches, returns nil.
      #
      #   # Single primary key
      #   Artist.dataset.with_pk(1)
      #   # SELECT * FROM artists WHERE (artists.id = 1) LIMIT 1
      #
      #   # Composite primary key
      #   Artist.dataset.with_pk([1, 2])
      #   # SELECT * FROM artists WHERE ((artists.id1 = 1) AND (artists.id2 = 2)) LIMIT 1
      def with_pk(pk)
        if pk && (loader = _with_pk_loader)
          loader.first(*pk)
        else
          first(model.qualified_primary_key_hash(pk))
        end
      end

      # Same as with_pk, but raises NoMatchingRow instead of returning nil if no
      # row matches.
      def with_pk!(pk)
        with_pk(pk) || raise(NoMatchingRow.new(self))
      end

      private

      # If the dataset is not already ordered, and the model has a primary key,
      # return a clone ordered by the primary key.
      def _primary_key_order
        if @opts[:order].nil? && model && (pk = model.primary_key)
          cached_dataset(:_pk_order_ds){order(*pk)}
        end
      end

      # A cached placeholder literalizer, if one exists for the current dataset.
      def _with_pk_loader
        cached_placeholder_literalizer(:_with_pk_loader) do |pl|
          table = model.table_name
          cond = case primary_key = model.primary_key
          when Array
            primary_key.map{|key| [SQL::QualifiedIdentifier.new(table, key), pl.arg]}
          when Symbol
            {SQL::QualifiedIdentifier.new(table, primary_key)=>pl.arg}
          else
            raise(Error, "#{model} does not have a primary key")
          end

          where(cond).limit(1)
        end
      end

      def non_sql_option?(key)
        super || key == :model
      end
    end

    extend ClassMethods
    plugin self

    singleton_class.send(:undef_method, :dup, :clone, :initialize_copy)
    if RUBY_VERSION >= '1.9.3'
      singleton_class.send(:undef_method, :initialize_clone, :initialize_dup)
    end
  end
end
