# frozen-string-literal: true

module Sequel
  module Plugins
    # The validates_associated plugin allows you to validate associated
    # objects.  It also offers the ability to delay the validation of
    # associated objects until the current object is validated.
    # If the associated object is invalid, validation error messages
    # from the associated object will be added to the current object's
    # validation errors.
    #
    # Usage:
    #
    #   # Make all model subclass support validating associated objects
    #   Sequel::Model.plugin :validate_associated
    #
    #   # Make the Album class support validating associated objects
    #   Album.plugin :validate_associated
    #
    #   class Album
    #     many_to_one :artist
    #     many_to_many :tags
    #
    #     # Always validate associated artist when saving the album
    #     def validate
    #       super
    #       if artist
    #         validate_associated_object(model.association_reflection(:artist), artist)
    #       end
    #     end
    #
    #     # When saving after calling this method, validate the given tag as well.
    #     def check_tag!(tag)
    #       delay_validate_associated_object(model.association_reflection(:tags), tag)
    #     end
    #   end
    module ValidateAssociated
      # Depend on the instance_hooks plugin.
      def self.apply(mod)
        mod.plugin :instance_hooks
      end

      module InstanceMethods
        private

        # Delay validating the associated object until validating the current object.
        def delay_validate_associated_object(reflection, obj)
          after_validation_hook{validate_associated_object(reflection, obj)}
        end

        # Validate the given associated object, adding any validation error messages from the
        # given object to the parent object.
        def validate_associated_object(reflection, obj)
          return if reflection[:validate] == false
          association = reflection[:name]
          if (reflection[:type] == :one_to_many || reflection[:type] == :one_to_one) && (key = reflection[:key]).is_a?(Symbol) && !(pk_val = obj.values[key])
            # There could be a presence validation on the foreign key in the associated model,
            # which will fail if we validate before saving the current object.  If there is
            # no value for the foreign key, set it to the current primary key value, or a dummy
            # value of 0 if we haven't saved the current object.
            p_key = pk unless pk.is_a?(Array)
            obj.values[key] = p_key || 0
            key = nil if p_key
          end
          obj.errors.full_messages.each{|m| errors.add(association, m)} unless obj.valid?
          if key && !pk_val
            # If we used a dummy value of 0, remove it so it doesn't accidently remain.
            obj.values.delete(key)
          end
        end
      end
    end
  end
end

