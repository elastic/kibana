# frozen-string-literal: true

module Sequel
  module Plugins
    # The delay_add_association plugin delays the adding of
    # associated objects to a new (unsaved) object until after the new
    # object is saved.  By default, if you attempt to add
    # associated objects to a new object, Sequel will raise
    # an error, because you need to have a primary key before
    # saving the objects.
    #
    # When delaying the add of an associated object, the object
    # will be immediately added to the cached association array.
    # When saving the current object, it will also attempt to
    # validate any associated objects, and if the associated objects
    # are not valid, the current object will also be considered
    # not valid.
    #
    # Usage:
    #
    #   # Make all model subclass delay add_association for new objects
    #   Sequel::Model.plugin :delay_add_association
    #
    #   # Make the Album class delay add_association for new objects
    #   Album.plugin :delay_add_association
    module DelayAddAssociation
      # Depend on the validate_associated plugin.
      def self.apply(mod)
        mod.plugin :validate_associated
      end

      module InstanceMethods
        private

        # Delay the addition of the associated object till after
        # saving the current object, if the current object is new
        # and the associated dataset requires a primary key on the
        # current object.
        def add_associated_object(opts, o, *args)
          if opts.dataset_need_primary_key? && new?
            o = make_add_associated_object(opts, o)
            delay_validate_associated_object(opts, o)
            public_send(opts[:name]) << o
            after_create_hook{super(opts, o, *args)}
            o
          else
            super
          end
        end
      end
    end
  end
end
