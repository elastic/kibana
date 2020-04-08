# frozen-string-literal: true

module Sequel
  module Plugins
    # The accessed_columns plugin records which columns have been
    # accessed for a model instance.  This is useful if you are
    # looking to remove other columns from being SELECTed by the
    # dataset that retrieved the instance, which can significantly
    # improve performance:
    #
    #   a = Album[1]
    #   a.accessed_columns # []
    #   a.name
    #   a.accessed_columns # [:name]
    #   a.artist_id
    #   a.accessed_columns # [:name, :artist_id]
    #
    # Note that this plugin should probably not be used in production,
    # as it causes a performance hit.
    # 
    # Usage:
    #
    #   # Make all model subclass instances record accessed columns (called before loading subclasses)
    #   Sequel::Model.plugin :accessed_columns
    #
    #   # Make the Album instances record accessed columns
    #   Album.plugin :accessed_columns
    module AccessedColumns
      module InstanceMethods
        # Record the column access before retrieving the value.
        def [](c)
          (@accessed_columns ||= {})[c] = true unless frozen?
          super
        end

        # Clear the accessed columns when saving.
        def after_save
          super
          @accessed_columns = nil
        end

        # The columns that have been accessed.
        def accessed_columns
          @accessed_columns ? @accessed_columns.keys : []
        end

        # Copy the accessed columns when duping and cloning.
        def initialize_copy(other)
          other.instance_variable_set(:@accessed_columns, Hash[@accessed_columns]) if @accessed_columns
          super
        end

        private

        # Clear the accessed columns when refreshing.
        def _refresh(_)
          @accessed_columns = nil
          super
        end
      end
    end
  end
end
