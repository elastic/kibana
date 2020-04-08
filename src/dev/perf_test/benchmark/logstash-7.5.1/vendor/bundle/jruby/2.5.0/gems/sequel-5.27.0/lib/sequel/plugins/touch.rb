# frozen-string-literal: true

module Sequel
  module Plugins
    # The touch plugin adds a touch method to model instances, which saves
    # the object with a modified timestamp.  By default, it uses the
    # :updated_at column, but you can set which column to use.
    # It also supports touching of associations, so that when the current
    # model object is updated or destroyed, the associated rows in the
    # database can have their modified timestamp updated to the current
    # timestamp.
    #
    # Since the instance touch method works on model instances,
    # it uses Time.now for the timestamp.  The association touching works
    # on datasets, so it updates all related rows in a single query, using
    # the SQL standard CURRENT_TIMESTAMP.  Both of these can be overridden
    # easily if necessary.
    # 
    # Usage:
    #
    #   # Allow touching of all model instances (called before loading subclasses)
    #   Sequel::Model.plugin :touch
    #
    #   # Allow touching of Album instances, with a custom column
    #   Album.plugin :touch, column: :updated_on
    #
    #   # Allow touching of Artist instances, updating the albums and tags
    #   # associations when touching, touching the +updated_on+ column for
    #   # albums and the +updated_at+ column for tags
    #   Artist.plugin :touch, associations: [{albums: :updated_on}, :tags]
    module Touch
      def self.apply(model, opts=OPTS)
        model.instance_variable_set(:@touched_associations, {})
      end

      # Set the touch_column and touched_associations variables for the model.
      # Options:
      # :associations :: The associations to touch when a model instance is
      #                  updated or destroyed.  Can be a symbol for a single association,
      #                  a hash with association keys and column values, or an array of
      #                  symbols and/or hashes.  If a symbol is used, the column used
      #                  when updating the associated objects is the model's touch_column.
      #                  If a hash is used, the value is used as the column to update.
      # :column :: The column to modify when touching a model instance.
      def self.configure(model, opts=OPTS)
        model.touch_column = opts[:column] || :updated_at if opts[:column] || !model.touch_column
        model.touch_associations(opts[:associations]) if opts[:associations]
      end

      module ClassMethods
        # The column to modify when touching a model instance, as a symbol.  Also used
        # as the default column when touching associations, if
        # the associations don't specify a column.
        attr_accessor :touch_column

        # A hash specifying the associations to touch when instances are
        # updated or destroyed. Keys are association name symbols and values
        # are column name symbols.
        attr_reader :touched_associations

        Plugins.inherited_instance_variables(self, :@touched_associations=>:dup, :@touch_column=>nil)

        # Freeze the touched associations when freezing the model class.
        def freeze
          @touched_associations.freeze

          super
        end

        # Add additional associations to be touched.  See the :association option
        # of the Sequel::Plugin::Touch.configure method for the format of the associations
        # arguments.
        def touch_associations(*associations)
          associations.flatten.each do |a|
            a = {a=>touch_column} if a.is_a?(Symbol)
            a.each do |k,v|
              raise(Error, "invalid association: #{k}") unless association_reflection(k)
              touched_associations[k] = v
            end
          end
        end
      end

      module InstanceMethods
        # Touch all of the model's touched_associations when creating the object.
        def after_create
          super
          touch_associations
        end

        # Touch all of the model's touched_associations when destroying the object.
        def after_destroy
          super
          touch_associations
        end

        # Touch all of the model's touched_associations when updating the object.
        def after_update
          super
          touch_associations
        end

        # Touch the model object.  If a column is not given, use the model's touch_column
        # as the column.  If the column to use is not one of the model's columns, just
        # save the changes to the object instead of attempting to a value that doesn't
        # exist.
        def touch(column=nil)
          if column
            set(column=>touch_instance_value)
          else
            column = model.touch_column
            set(column=>touch_instance_value) if columns.include?(column)
          end
          save_changes
        end

        private

        # The value to use when modifying the touch column for the association datasets.  Uses
        # the SQL standard CURRENT_TIMESTAMP.
        def touch_association_value
          Sequel::CURRENT_TIMESTAMP
        end

        # Update the updated at field for all associated objects that should be touched.
        def touch_associations
          model.touched_associations.each do |assoc, column|
            r = model.association_reflection(assoc)
            next unless r.can_have_associated_objects?(self)
            ds = public_send(r[:dataset_method])

            if ds.send(:joined_dataset?)
              # Can't update all values at once, so update each instance individually.
              # Instead if doing a simple save, update via the instance's dataset,
              # to avoid going into an infinite loop in some cases.
              public_send(assoc).each{|x| x.this.update(column=>touch_association_value)}
            else
              # Update all values at once for performance reasons.
              ds.update(column=>touch_association_value)
              associations.delete(assoc)
            end
          end
        end

        # The value to use when modifying the touch column for the model instance.
        # Uses Time/DateTime.now to work well with typecasting.
        def touch_instance_value
          model.dataset.current_datetime
        end
      end
    end
  end
end
