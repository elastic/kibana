# frozen-string-literal: true

module Sequel
  class Database
    # ---------------------
    # :section: 5 - Methods that set defaults for created datasets
    # This methods change the default behavior of this database's datasets.
    # ---------------------

    # The class to use for creating datasets.  Should respond to
    # new with the Database argument as the first argument, and
    # an optional options hash.
    attr_reader :dataset_class

    # If the database has any dataset modules associated with it,
    # use a subclass of the given class that includes the modules
    # as the dataset class.
    def dataset_class=(c)
      unless @dataset_modules.empty?
        c = Class.new(c)
        @dataset_modules.each{|m| c.send(:include, m)}
      end
      @dataset_class = c
      reset_default_dataset
    end

    # Equivalent to extending all datasets produced by the database with a
    # module.  What it actually does is use a subclass of the current dataset_class
    # as the new dataset_class, and include the module in the subclass.
    # Instead of a module, you can provide a block that is used to create an
    # anonymous module.
    #
    # This allows you to override any of the dataset methods even if they are
    # defined directly on the dataset class that this Database object uses.
    #
    # If a block is given, a Dataset::DatasetModule instance is created, allowing
    # for the easy creation of named dataset methods that will do caching.
    #
    # Examples:
    #
    #   # Introspect columns for all of DB's datasets
    #   DB.extend_datasets(Sequel::ColumnsIntrospection)
    #   
    #   # Trace all SELECT queries by printing the SQL and the full backtrace
    #   DB.extend_datasets do
    #     def fetch_rows(sql)
    #       puts sql
    #       puts caller
    #       super
    #     end
    #   end
    #
    #   # Add some named dataset methods
    #   DB.extend_datasets do
    #     order :by_id, :id
    #     select :with_id_and_name, :id, :name
    #     where :active, :active
    #   end
    #
    #   DB[:table].active.with_id_and_name.by_id
    #   # SELECT id, name FROM table WHERE active ORDER BY id
    def extend_datasets(mod=nil, &block)
      raise(Error, "must provide either mod or block, not both") if mod && block
      mod = Dataset::DatasetModule.new(&block) if block
      if @dataset_modules.empty?
       @dataset_modules = [mod]
       @dataset_class = Class.new(@dataset_class)
      else
       @dataset_modules << mod
      end
      @dataset_class.send(:include, mod)
      reset_default_dataset
    end

    private
    
    # The default dataset class to use for the database
    def dataset_class_default
      Sequel::Dataset
    end

    # Reset the default dataset used by most Database methods that create datasets.
    def reset_default_dataset
      Sequel.synchronize{@symbol_literal_cache.clear}
      @default_dataset = dataset
    end

    # Whether to quote identifiers by default for this database, true by default.
    def quote_identifiers_default
      true
    end
  end
end
