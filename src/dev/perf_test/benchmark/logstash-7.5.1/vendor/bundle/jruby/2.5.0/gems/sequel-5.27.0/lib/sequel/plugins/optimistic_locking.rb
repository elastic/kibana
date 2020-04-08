# frozen-string-literal: true

module Sequel
  module Plugins
    # This plugin implements a simple database-independent locking mechanism
    # to ensure that concurrent updates do not override changes. This is
    # best implemented by a code example:
    # 
    #   class Person < Sequel::Model
    #     plugin :optimistic_locking
    #   end
    #   p1 = Person[1]
    #   p2 = Person[1]
    #   p1.update(name: 'Jim') # works
    #   p2.update(name: 'Bob') # raises Sequel::Plugins::OptimisticLocking::Error
    #
    # In order for this plugin to work, you need to make sure that the database
    # table has a +lock_version+ column (or other column you name via the lock_column
    # class level accessor) that defaults to 0.
    #
    # This plugin relies on the instance_filters plugin.
    module OptimisticLocking
      # Exception class raised when trying to update or destroy a stale object.
      Error = Sequel::NoExistingObject
      
      # Load the instance_filters plugin into the model.
      def self.apply(model, opts=OPTS)
        model.plugin :instance_filters
      end

      # Set the lock_column to the :lock_column option, or :lock_version if
      # that option is not given.
      def self.configure(model, opts=OPTS)
        model.lock_column = opts[:lock_column] || :lock_version
      end
      
      module ClassMethods
        # The column holding the version of the lock
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
          instance_filter(lc=>get_column_value(lc))
        end

        # Clear the instance filters when refreshing, so that attempting to
        # refresh after a failed save removes the previous lock column filter
        # (the new one will be added before updating).
        def _refresh(ds)
          clear_instance_filters
          super
        end
        
        # Only update the row if it has the same lock version, and increment the
        # lock version.
        def _update_columns(columns)
          lc = model.lock_column
          lcv = get_column_value(lc)
          columns[lc] = lcv + 1
          super
          set_column_value("#{lc}=", lcv + 1)
        end
      end
    end
  end
end
