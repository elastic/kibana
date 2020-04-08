# frozen-string-literal: true

module Sequel
  module Plugins
    # This plugin extends the serialization plugin and enables it to detect
    # changes in serialized values by checking whether the current
    # deserialized value is the same as the original deserialized value.
    # The serialization plugin does not do such checks by default, as they
    # often aren't needed and can hurt performance.
    #
    # Note that for this plugin to work correctly, the values you are
    # serializing must roundtrip correctly (i.e. deserialize(serialize(value))
    # should equal value).  This is true in most cases, but not in all.  For
    # example, ruby symbols round trip through yaml, but not json (as they get
    # turned into strings in json).
    #
    # == Example
    #
    #   require 'sequel'
    #   require 'json'
    #   class User < Sequel::Model
    #     plugin :serialization, :json, :permissions
    #     plugin :serialization_modification_detection
    #   end
    #   user = User.create(permissions: {})
    #   user.permissions[:global] = 'read-only'
    #   user.save_changes
    module SerializationModificationDetection
      # Load the serialization plugin automatically.
      def self.apply(model)
        model.plugin :serialization
      end
      
      module InstanceMethods
        # Clear the cache of original deserialized values after saving so that it doesn't
        # show the column is modified after saving.
        def after_save
          super
          @original_deserialized_values = @deserialized_values
        end

        # Detect which serialized columns have changed.
        def changed_columns
          cc = super
          cc = cc.dup if frozen?
          deserialized_values.each{|c, v| cc << c if !cc.include?(c) && original_deserialized_value(c) != v} 
          cc
        end

        # Freeze the original deserialized values when freezing the instance.
        def freeze
          @original_deserialized_values ||= {}
          @original_deserialized_values.freeze
          super
        end

        private

        # Duplicate the original deserialized values when duplicating instance.
        def initialize_copy(other)
          super
          if o = other.instance_variable_get(:@original_deserialized_values)
            @original_deserialized_values = Hash[o]
          end
          self
        end

        # For new objects, serialize any existing deserialized values so that changes can
        # be detected.
        def initialize_set(values)
          super
          serialize_deserialized_values
        end

        # Return the original deserialized value of the column, caching it to improve performance.
        def original_deserialized_value(column)
          if frozen?
            @original_deserialized_values[column] || deserialize_value(column, self[column])
          else
            (@original_deserialized_values ||= {})[column] ||= deserialize_value(column, self[column])
          end
        end
      end
    end
  end
end
