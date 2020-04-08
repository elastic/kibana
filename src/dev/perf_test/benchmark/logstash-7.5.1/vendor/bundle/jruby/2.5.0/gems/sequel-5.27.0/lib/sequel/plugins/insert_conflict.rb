# frozen-string-literal: true

module Sequel
  module Plugins
    # The insert_conflict plugin allows handling conflicts due to unique
    # constraints when saving new model instance, using the INSERT ON CONFLICT
    # support in PostgreSQL 9.5+ and SQLite 3.24.0+. Example:
    #
    #   class Album < Sequel::Model
    #     plugin :insert_conflict
    #   end
    #
    #   Album.new(name: 'Foo', copies_sold: 1000).
    #     insert_conflict(
    #       target: :name,
    #       update: {copies_sold: Sequel[:excluded][:b]}
    #     ).
    #     save
    #
    # This example will try to insert the album, but if there is an existing
    # album with the name 'Foo', this will update the copies_sold attribute
    # for that album.  See the PostgreSQL and SQLite adapter documention for
    # the options you can pass to the insert_conflict method.
    #
    # Usage:
    #
    #   # Make all model subclasses support insert_conflict
    #   Sequel::Model.plugin :insert_conflict
    #
    #   # Make the Album class support insert_conflict
    #   Album.plugin :insert_conflict
    module InsertConflict
      def self.configure(model)
        model.instance_exec do
          if @dataset && !@dataset.respond_to?(:insert_conflict)
            raise Error, "#{self}'s dataset does not support insert_conflict"
          end
        end
      end

      module InstanceMethods
        # Set the insert_conflict options to pass to the dataset when inserting. 
        def insert_conflict(opts=OPTS)
          raise Error, "Model#insert_conflict is only supported on new model instances" unless new?
          @insert_conflict_opts = opts
          self
        end

        private

        # Set the dataset used for inserting to use INSERT ON CONFLICT
        # Model#insert_conflict has been called on the instance previously.
        def _insert_dataset
          ds = super

          if @insert_conflict_opts
            ds = ds.insert_conflict(@insert_conflict_opts)
          end

          ds
        end

        # Disable the use of prepared insert statements, as they are not compatible
        # with this plugin.
        def use_prepared_statements_for?(type)
          return false if type == :insert || type == :insert_select
          super if defined?(super)
        end
      end
    end
  end
end
