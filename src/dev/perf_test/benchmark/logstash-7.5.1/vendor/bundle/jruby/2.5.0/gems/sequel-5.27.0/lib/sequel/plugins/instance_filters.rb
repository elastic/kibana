# frozen-string-literal: true

module Sequel
  module Plugins
    # This plugin allows you to add filters on a per object basis that
    # restrict updating or deleting the object.  It's designed for cases
    # where you would normally have to drop down to the dataset level
    # to get the necessary control, because you only want to delete or
    # update the rows in certain cases based on the current status of
    # the row in the database.  The main purpose of this plugin is to
    # avoid race conditions by relying on the atomic properties of database
    # transactions.
    # 
    #   class Item < Sequel::Model
    #     plugin :instance_filters
    #   end
    #
    #   # These are two separate objects that represent the same
    #   # database row. 
    #   i1 = Item.first(id: 1, delete_allowed: false)
    #   i2 = Item.first(id: 1, delete_allowed: false)
    #
    #   # Add an instance filter to the object. This filter is in effect
    #   # until the object is successfully updated or deleted.
    #   i1.instance_filter(delete_allowed: true)
    #
    #   # Attempting to delete the object where the filter doesn't
    #   # match any rows raises an error.
    #   i1.delete # raises Sequel::NoExistingObject
    #
    #   # The other object that represents the same row has no
    #   # instance filters, and can be updated normally.
    #   i2.update(delete_allowed: true)
    #
    #   # Even though the filter is now still in effect, since the
    #   # database row has been updated to allow deleting,
    #   # delete now works.
    #   i1.delete
    #
    # This plugin sets the require_modification flag on the model,
    # so if the model's dataset doesn't provide an accurate number
    # of matched rows, this could result in invalid exceptions being raised.
    module InstanceFilters
      # Exception class raised when updating or deleting an object does
      # not affect exactly one row.
      Error = Sequel::NoExistingObject
      
      # Set the require_modification flag to true for the model.
      def self.configure(model)
        model.require_modification = true
      end

      module InstanceMethods
        # Clear the instance filters after successfully destroying the object.
        def after_destroy
          super
          clear_instance_filters
        end
        
        # Clear the instance filters after successfully updating the object.
        def after_update
          super
          clear_instance_filters
        end

        # Freeze the instance filters when freezing the object
        def freeze
          instance_filters.freeze
          super
        end
      
        # Add an instance filter to the array of instance filters
        # Both the arguments given and the block are passed to the
        # dataset's filter method.
        def instance_filter(*args, &block)
          instance_filters << [args, block]
        end
      
        private
        
        # If there are any instance filters, make sure not to use the
        # instance delete optimization.
        def _delete_without_checking
          if @instance_filters && !@instance_filters.empty?
            _delete_dataset.delete 
          else
            super
          end
        end

        # Duplicate internal structures when duplicating model instance.
        def initialize_copy(other)
          super
          @instance_filters = other.send(:instance_filters).dup
          self
        end
      
        # Lazily initialize the instance filter array.
        def instance_filters
          @instance_filters ||= []
        end
        
        # Apply the instance filters to the given dataset
        def apply_instance_filters(ds)
          instance_filters.inject(ds){|ds1, i| ds1.where(*i[0], &i[1])}
        end
        
        # Clear the instance filters.
        def clear_instance_filters
          instance_filters.clear
        end
        
        # Apply the instance filters to the dataset returned by super.
        def _delete_dataset
          apply_instance_filters(super)
        end
        
        # Apply the instance filters to the dataset returned by super.
        def _update_dataset
          apply_instance_filters(super)
        end

        # Only use prepared statements for update and delete queries
        # if there are no instance filters.
        def use_prepared_statements_for?(type)
          if type == :update && !instance_filters.empty?
            false
          else
            super if defined?(super)
          end
        end
      end
    end
  end
end
