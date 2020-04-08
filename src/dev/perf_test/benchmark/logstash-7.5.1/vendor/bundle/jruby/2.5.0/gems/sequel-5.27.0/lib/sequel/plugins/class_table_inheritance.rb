# frozen-string-literal: true

module Sequel
  module Plugins
    # = Overview
    #
    # The class_table_inheritance plugin uses the single_table_inheritance
    # plugin, so it supports all of the single_table_inheritance features, but it
    # additionally supports subclasses that have additional columns,
    # which are stored in a separate table with a key referencing the primary table.
    #
    # = Detail
    #
    # For example, with this hierarchy:
    #
    #       Employee
    #      /        \
    #   Staff     Manager
    #     |          |
    #   Cook      Executive
    #                |
    #               CEO
    #
    # the following database schema may be used (table - columns):
    #
    # employees :: id, name, kind
    # staff :: id, manager_id
    # managers :: id, num_staff
    # executives :: id, num_managers
    #
    # The class_table_inheritance plugin assumes that the root table
    # (e.g. employees) has a primary key column (usually autoincrementing),
    # and all other tables have a foreign key of the same name that points
    # to the same column in their superclass's table, which is also the primary
    # key for that table.  In this example, the employees table has an id column
    # is a primary key and the id column in every other table is a foreign key
    # referencing employees.id, which is also the primary key of that table.
    #
    # Additionally, note that other than the primary key column, no subclass
    # table has a column with the same name as any superclass table. This plugin
    # does not support cases where the column names in a subclass table overlap
    # with any column names in a superclass table.
    #
    # In this example the staff table also stores Cook model objects and the
    # executives table also stores CEO model objects.
    #
    # When using the class_table_inheritance plugin, subclasses that have additional
    # columns use joined datasets in subselects:
    #
    #   Employee.dataset.sql
    #   # SELECT * FROM employees
    #
    #   Manager.dataset.sql
    #   # SELECT * FROM (
    #   #   SELECT employees.id, employees.name, employees.kind,
    #   #          managers.num_staff
    #   #   FROM employees
    #   #   JOIN managers ON (managers.id = employees.id)
    #   # ) AS employees
    #
    #   CEO.dataset.sql
    #   # SELECT * FROM (
    #   #   SELECT employees.id, employees.name, employees.kind,
    #   #          managers.num_staff, executives.num_managers
    #   #   FROM employees
    #   #   JOIN managers ON (managers.id = employees.id)
    #   #   JOIN executives ON (executives.id = managers.id)
    #   #   WHERE (employees.kind IN ('CEO'))
    #   # ) AS employees
    #
    # This allows CEO.all to return instances with all attributes
    # loaded.  The plugin overrides the deleting, inserting, and updating
    # in the model to work with multiple tables, by handling each table
    # individually.
    #
    # = Subclass loading
    #
    # When model objects are retrieved for a superclass the result can contain
    # subclass instances that only have column entries for the columns in the
    # superclass table.  Calling the column method on the subclass instance for
    # a column not in the superclass table will cause a query to the database
    # to get the value for that column.  If the subclass instance was retreived
    # using Dataset#all, the query to the database will attempt to load the column
    # values for all subclass instances that were retrieved.  For example:
    #
    #   a = Employee.all # [<#Staff>, <#Manager>, <#Executive>]
    #   a.first.values # {:id=>1, name=>'S', :kind=>'Staff'}
    #   a.first.manager_id # Loads the manager_id attribute from the database
    #
    # If you want to get all columns in a subclass instance after loading
    # via the superclass, call Model#refresh.
    #
    #   a = Employee.first
    #   a.values # {:id=>1, name=>'S', :kind=>'CEO'}
    #   a.refresh.values # {:id=>1, name=>'S', :kind=>'CEO', :num_staff=>4, :num_managers=>2}
    #
    # You can also load directly from a subclass:
    #
    #   a = Executive.first
    #   a.values # {:id=>1, name=>'S', :kind=>'Executive', :num_staff=>4, :num_managers=>2}
    #
    # Note that when loading from a subclass, because the subclass dataset uses a subquery
    # that by default uses the same alias at the primary table, any qualified identifiers
    # should reference the subquery alias (and qualified identifiers should not be needed
    # unless joining to another table):
    #
    #   a = Executive.where(:id=>1).first # works
    #   a = Executive.where{{employees[:id]=>1}}.first # works
    #   a = Executive.where{{executives[:id]=>1}}.first # doesn't work
    #
    # Note that because subclass datasets select from a subquery, you cannot update,
    # delete, or insert into them directly.  To delete related rows, you need to go
    # through the related tables and remove the related rows.  Code that does this would
    # be similar to:
    #
    #   pks = Executive.where{num_staff < 10}.select_map(:id)
    #   Executive.cti_tables.reverse_each do |table|
    #     DB.from(table).where(:id=>pks).delete
    #   end
    #
    # = Usage
    #
    #   # Use the default of storing the class name in the sti_key
    #   # column (:kind in this case)
    #   class Employee < Sequel::Model
    #     plugin :class_table_inheritance, key: :kind
    #   end
    #
    #   # Have subclasses inherit from the appropriate class
    #   class Staff < Employee; end    # uses staff table
    #   class Cook < Staff; end        # cooks table doesn't exist so uses staff table
    #   class Manager < Employee; end  # uses managers table
    #   class Executive < Manager; end # uses executives table
    #   class CEO < Executive; end     # ceos table doesn't exist so uses executives table
    #
    #   # Some examples of using these options:
    #
    #   # Specifying the tables with a :table_map hash
    #   Employee.plugin :class_table_inheritance,
    #     table_map: {Employee:  :employees,
    #                 Staff:     :staff,
    #                 Cook:      :staff,
    #                 Manager:   :managers,
    #                 Executive: :executives,
    #                 CEO:       :executives }
    #
    #   # Using integers to store the class type, with a :model_map hash
    #   # and an sti_key of :type
    #   Employee.plugin :class_table_inheritance, key: :type,
    #     model_map: {1=>:Staff, 2=>:Cook, 3=>:Manager, 4=>:Executive, 5=>:CEO}
    #
    #   # Using non-class name strings
    #   Employee.plugin :class_table_inheritance, key: :type,
    #     model_map: {'staff'=>:Staff, 'cook staff'=>:Cook, 'supervisor'=>:Manager}
    #
    #   # By default the plugin sets the respective column value
    #   # when a new instance is created.
    #   Cook.create.type == 'cook staff'
    #   Manager.create.type == 'supervisor'
    #
    #   # You can customize this behavior with the :key_chooser option.
    #   # This is most useful when using a non-bijective mapping.
    #   Employee.plugin :class_table_inheritance, key: :type,
    #     model_map: {'cook staff'=>:Cook, 'supervisor'=>:Manager},
    #     key_chooser: proc{|instance| instance.model.sti_key_map[instance.model.to_s].first || 'stranger' }
    #
    #   # Using custom procs, with :model_map taking column values
    #   # and yielding either a class, string, symbol, or nil,
    #   # and :key_map taking a class object and returning the column
    #   # value to use
    #   Employee.plugin :single_table_inheritance, key: :type,
    #     model_map: proc{|v| v.reverse},
    #     key_map: proc{|klass| klass.name.reverse}
    #
    #   # You can use the same class for multiple values.
    #   # This is mainly useful when the sti_key column contains multiple values
    #   # which are different but do not require different code.
    #   Employee.plugin :single_table_inheritance, key: :type,
    #     model_map: {'staff' => "Staff",
    #                 'manager' => "Manager",
    #                 'overpayed staff' => "Staff",
    #                 'underpayed staff' => "Staff"}
    #
    # One minor issue to note is that if you specify the <tt>:key_map</tt>
    # option as a hash, instead of having it inferred from the <tt>:model_map</tt>,
    # you should only use class name strings as keys, you should not use symbols
    # as keys.
    module ClassTableInheritance
      # The class_table_inheritance plugin requires the single_table_inheritance
      # plugin and the lazy_attributes plugin to handle lazily-loaded attributes
      # for subclass instances returned by superclass methods.
      def self.apply(model, opts = OPTS)
        model.plugin :single_table_inheritance, nil
        model.plugin :lazy_attributes
      end

      # Initialize the plugin using the following options:
      # :alias :: Change the alias used for the subquery in model datasets.
      #           using this as the alias.
      # :key :: Column symbol that holds the key that identifies the class to use.
      #         Necessary if you want to call model methods on a superclass
      #         that return subclass instances
      # :model_map :: Hash or proc mapping the key column values to model class names.
      # :key_map :: Hash or proc mapping model class names to key column values.
      #             Each value or return is an array of possible key column values.
      # :key_chooser :: proc returning key for the provided model instance
      # :table_map :: Hash with class name symbols keys mapping to table name symbol values.
      #               Overrides implicit table names.
      # :ignore_subclass_columns :: Array with column names as symbols that are ignored
      #                             on all sub-classes.
      # :qualify_tables :: Boolean true to qualify automatically determined
      #                    subclass tables with the same qualifier as their
      #                    superclass.
      def self.configure(model, opts = OPTS)
        SingleTableInheritance.configure model, opts[:key], opts

        model.instance_exec do
          @cti_models = [self]
          @cti_tables = [table_name]
          @cti_instance_dataset = @instance_dataset
          @cti_table_columns = columns
          @cti_table_map = opts[:table_map] || {}
          @cti_alias = opts[:alias] || case source = @dataset.first_source
          when SQL::QualifiedIdentifier
            @dataset.unqualified_column_for(source)
          else
            source
          end
          @cti_ignore_subclass_columns = opts[:ignore_subclass_columns] || []
          @cti_qualify_tables = !!opts[:qualify_tables]
        end
      end

      module ClassMethods
        # An array of each model in the inheritance hierarchy that is
        # backed by a new table.
        attr_reader :cti_models

        # An array of column symbols for the backing database table,
        # giving the columns to update in each backing database table.
        attr_reader :cti_table_columns

        # The dataset that table instance datasets are based on.
        # Used for database modifications
        attr_reader :cti_instance_dataset

        # An array of table symbols that back this model.  The first is
        # table symbol for the base model, and the last is the current model
        # table symbol.
        attr_reader :cti_tables

        # A hash with class name symbol keys and table name symbol values.
        # Specified with the :table_map option to the plugin, and should be used if
        # the implicit naming is incorrect.
        attr_reader :cti_table_map

        # An array of columns that may be duplicated in sub-classes. The
        # primary key column is always allowed to be duplicated
        attr_reader :cti_ignore_subclass_columns

        # A boolean indicating whether or not to automatically qualify tables
        # backing subclasses with the same qualifier as their superclass, if
        # the superclass is qualified. Specified with the :qualify_tables
        # option to the plugin and only applied to automatically determined
        # table names (not to the :table_map option).
        attr_reader :cti_qualify_tables

        # Freeze CTI information when freezing model class.
        def freeze
          @cti_models.freeze
          @cti_tables.freeze
          @cti_table_columns.freeze
          @cti_table_map.freeze
          @cti_ignore_subclass_columns.freeze

          super
        end

        Plugins.inherited_instance_variables(self, :@cti_models=>nil, :@cti_tables=>nil, :@cti_table_columns=>nil, :@cti_instance_dataset=>nil, :@cti_table_map=>nil, :@cti_alias=>nil, :@cti_ignore_subclass_columns=>nil, :@cti_qualify_tables=>nil)

        def inherited(subclass)
          ds = sti_dataset

          # Prevent inherited in model/base.rb from setting the dataset
          subclass.instance_exec { @dataset = nil }

          super

          # Set table if this is a class table inheritance
          table = nil
          columns = nil
          if (n = subclass.name) && !n.empty?
            if table = cti_table_map[n.to_sym]
              columns = db.schema(table).map(&:first)
            else
              table = if cti_qualify_tables && (schema = dataset.schema_and_table(cti_table_name).first)
                SQL::QualifiedIdentifier.new(schema, subclass.implicit_table_name)
              else
                subclass.implicit_table_name
              end
              columns = check_non_connection_error(false){db.schema(table) && db.schema(table).map(&:first)}
              table = nil if !columns || columns.empty?
            end
          end
          table = nil if table && (table == cti_table_name)

          return unless table

          pk = primary_key
          subclass.instance_exec do
            if cti_tables.length == 1
              ds = ds.select(*self.columns.map{|cc| Sequel.qualify(cti_table_name, Sequel.identifier(cc))})
            end
            ds.send(:columns=, self.columns)
            cols = (columns - [pk]) - cti_ignore_subclass_columns
            dup_cols = cols & ds.columns
            unless dup_cols.empty?
              raise Error, "class_table_inheritance with duplicate column names (other than the primary key column) is not supported, make sure tables have unique column names (duplicate columns: #{dup_cols}). If this is desired, specify these columns in the :ignore_subclass_columns option when initializing the plugin"
            end
            sel_app = cols.map{|cc| Sequel.qualify(table, Sequel.identifier(cc))}
            @sti_dataset = ds = ds.join(table, pk=>pk).select_append(*sel_app)

            ds = ds.from_self(:alias=>@cti_alias)
            ds.send(:columns=, self.columns + cols)

            set_dataset(ds)
            set_columns(self.columns)
            @dataset = @dataset.with_row_proc(lambda{|r| subclass.sti_load(r)})
            cols.each{|a| define_lazy_attribute_getter(a, :dataset=>dataset, :table=>@cti_alias)}

            @cti_models += [self]
            @cti_tables += [table]
            @cti_table_columns = columns
            @cti_instance_dataset = db.from(table)

            cti_tables.reverse_each do |ct|
              db.schema(ct).each{|sk,v| db_schema[sk] = v}
            end
            setup_auto_validations if respond_to?(:setup_auto_validations, true)
          end
        end

        # The table name for the current model class's main table.
        def table_name
          if cti_tables && cti_tables.length > 1
            @cti_alias
          else
            super
          end
        end

        # The name of the most recently joined table.
        def cti_table_name
          cti_tables ? cti_tables.last : dataset.first_source_alias
        end

        # The model class for the given key value.
        def sti_class_from_key(key)
          sti_class(sti_model_map[key])
        end

        private

        # If using a subquery for class table inheritance, also use a subquery
        # when setting subclass dataset.
        def sti_subclass_dataset(key)
          ds = super
          if cti_models[0] != self
            ds = ds.from_self(:alias=>@cti_alias)
          end
          ds
        end
      end

      module InstanceMethods
        # Delete the row from all backing tables, starting from the
        # most recent table and going through all superclasses.
        def delete
          raise Sequel::Error, "can't delete frozen object" if frozen?
          model.cti_models.reverse_each do |m|
            cti_this(m).delete
          end
          self
        end

        # Don't allow use of prepared statements.
        def use_prepared_statements_for?(type)
          false
        end

        # Set the sti_key column based on the sti_key_map.
        def before_validation
          if new? && (set = self[model.sti_key])
            exp = model.sti_key_chooser.call(self)
            if set != exp
              set_table = model.sti_class_from_key(set).cti_table_name
              exp_table = model.sti_class_from_key(exp).cti_table_name
              set_column_value("#{model.sti_key}=", exp) if set_table != exp_table
            end
          end
          super
        end

        private

        def cti_this(model)
          use_server(model.cti_instance_dataset.where(model.primary_key_hash(pk)))
        end

        # Insert rows into all backing tables, using the columns
        # in each table.
        def _insert
          return super if model.cti_models[0] == model
          model.cti_models.each do |m|
            v = {}
            m.cti_table_columns.each{|c| v[c] = @values[c] if @values.include?(c)}
            ds = use_server(m.cti_instance_dataset)
            if ds.supports_insert_select? && (h = ds.insert_select(v))
              @values.merge!(h)
            else
              nid = ds.insert(v)
              @values[primary_key] ||= nid
            end
          end
          db.dataset.supports_insert_select? ? nil : @values[primary_key]
        end

        # Update rows in all backing tables, using the columns in each table.
        def _update(columns)
          return super if model.cti_models[0] == model
          model.cti_models.each do |m|
            h = {}
            m.cti_table_columns.each{|c| h[c] = columns[c] if columns.include?(c)}
            unless h.empty?
              ds = cti_this(m)
              n = ds.update(h)
              raise(NoExistingObject, "Attempt to update object did not result in a single row modification (SQL: #{ds.update_sql(h)})") if require_modification && n != 1
            end
          end
        end
      end
    end
  end
end
