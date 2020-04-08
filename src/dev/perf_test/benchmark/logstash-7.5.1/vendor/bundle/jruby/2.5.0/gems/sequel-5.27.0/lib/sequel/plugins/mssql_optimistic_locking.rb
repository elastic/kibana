# frozen-string-literal: true

module Sequel
  module Plugins
    # This plugin implements optimistic locking mechanism on Microsoft SQL Server
    # using a timestamp/rowversion column to ensure that concurrent updates are
    # detected and previous changes are not automatically overridden. This is
    # best implemented by a code example:
    # 
    #   class Person < Sequel::Model
    #     plugin :mssql_optimistic_locking
    #   end
    #   p1 = Person[1]
    #   p2 = Person[1]
    #   p1.update(name: 'Jim') # works
    #   p2.update(name: 'Bob') # raises Sequel::NoExistingObject
    #
    # In order for this plugin to work, you need to make sure that the database
    # table has a column of timestamp or rowversion.  The plugin uses a default
    # name of timestamp for this columns, but you can override that using the
    # :lock_column option:
    #
    #     plugin :mssql_optimistic_locking, lock_column: :column_name
    #
    # This plugin relies on the instance_filters plugin.
    module MssqlOptimisticLocking
      # Load the instance_filters plugin into the model.
      def self.apply(model, opts=OPTS)
        model.plugin :instance_filters
      end

      # Set the lock_column to the :lock_column option (default: :timestamp)
      def self.configure(model, opts=OPTS)
        model.lock_column = opts[:lock_column] || :timestamp
      end

      module ClassMethods
        # The timestamp/rowversion column containing the version for the current row.
        attr_accessor :lock_column

        Plugins.inherited_instance_variables(self, :@lock_column=>nil)
      end

      module InstanceMethods
        # Add the lock column instance filter to the object before destroying it.
        def before_destroy
          lock_column_instance_filter
          super
        end
        
        # Add the lock column instance filter to the object before updating it.
        def before_update
          lock_column_instance_filter
          super
        end
        
        private
        
        # Add the lock column instance filter to the object.
        def lock_column_instance_filter
          lc = model.lock_column
          instance_filter(lc=>Sequel.blob(get_column_value(lc)))
        end

        # Clear the instance filters when refreshing, so that attempting to
        # refresh after a failed save removes the previous lock column filter
        # (the new one will be added before updating).
        def _refresh(ds)
          clear_instance_filters
          super
        end

        # Remove the lock column from the columns to update.
        # SQL Server automatically updates the lock column value, and does not like
        # it to be assigned.
        def _save_update_all_columns_hash
          v = @values.dup
          cc = changed_columns
          Array(primary_key).each{|x| v.delete(x) unless cc.include?(x)}
          v.delete(model.lock_column)
          v
        end

        # Add an OUTPUT clause to fetch the updated timestamp when updating the row.
        def _update_without_checking(columns)
          ds = _update_dataset
          lc = model.lock_column
          rows = ds.clone(ds.send(:default_server_opts, :sql=>ds.output(nil, [Sequel[:inserted][lc]]).update_sql(columns))).all
          values[lc] = rows.first[lc] unless rows.empty?
          rows.length
        end
      end
    end
  end
end
