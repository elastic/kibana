# frozen-string-literal: true

module Sequel
  module Plugins
    # The update_primary_key plugin allows you to modify an object's
    # primary key and then save the record.  Sequel does not work
    # correctly with primary key modifications by default.  Sequel
    # is designed to work with surrogate primary keys that never need to be
    # modified, but this plugin makes it work correctly with natural
    # primary keys that may need to be modified. Example:
    #
    #   album = Album[1]
    #   album.id = 2
    #   album.save
    # 
    # Usage:
    #
    #   # Make all model subclasses support primary key updates
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :update_primary_key
    #
    #   # Make the Album class support primary key updates
    #   Album.plugin :update_primary_key
    module UpdatePrimaryKey
      module InstanceMethods
        # Clear the cached primary key.
        def after_update
          super
          @pk_hash = nil
        end

        # Use the cached primary key if one is present.
        def pk_hash
          @pk_hash || super
        end

        private

        # If the primary key column changes, clear related associations and cache
        # the previous primary key values.
        def change_column_value(column, value)
          pk = primary_key
          if (pk.is_a?(Array) ? pk.include?(column) : pk == column)
            @pk_hash ||= pk_hash unless new?
            clear_associations_using_primary_key
          end
          super
        end

        # Clear associations that are likely to be tied to the primary key.
        # Note that this currently can clear additional options that don't reference
        # the primary key (such as one_to_many columns referencing a column other than the
        # primary key).
        def clear_associations_using_primary_key
          associations.keys.each do |k|
            associations.delete(k) if model.association_reflection(k)[:type] != :many_to_one
          end
        end

        # Do not use prepared statements for update queries, since they don't work
        # in the case where the primary key has changed.
        def use_prepared_statements_for?(type)
          if type == :update
            false
          else
            super if defined?(super)
          end
        end
      end
    end
  end
end
