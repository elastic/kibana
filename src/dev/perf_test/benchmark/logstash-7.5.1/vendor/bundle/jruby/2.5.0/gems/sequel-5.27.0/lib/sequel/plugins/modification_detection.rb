# frozen-string-literal: true

module Sequel
  module Plugins
    # This plugin automatically detects in-place modifications to
    # columns as well as direct modifications of the values hash.
    #
    #   class User < Sequel::Model
    #     plugin :modification_detection
    #   end
    #   user = User[1]
    #   user.a # => 'a'
    #   user.a << 'b'
    #   user.save_changes
    #   # UPDATE users SET a = 'ab' WHERE (id = 1)
    #
    # Note that for this plugin to work correctly, the column values must
    # correctly implement the #hash method, returning the same value if
    # the object is equal, and a different value if the object is not equal.
    # As this solely uses hash values to check for modification, there may
    # be cases where a modification is made and the hash value is the same,
    # resulting in a false negative.
    #
    # Note that this plugin causes a performance hit for all retrieved
    # objects, so it shouldn't be used in cases where performance is a
    # primary concern.
    #
    # Usage:
    #
    #   # Make all model subclass automatically detect column modifications
    #   Sequel::Model.plugin :modification_detection
    #
    #   # Make the Album class automatically detect column modifications
    #   Album.plugin :modification_detection
    module ModificationDetection
      module ClassMethods
        # Calculate the hashes for all of the column values, so that they
        # can be compared later to determine if the column value has changed.
        def call(_)
          v = super
          v.calculate_values_hashes
          v
        end
      end

      module InstanceMethods
        # Recalculate the column value hashes after updating.
        def after_update
          super
          recalculate_values_hashes
        end

        # Calculate the column hash values if they haven't been already calculated.
        def calculate_values_hashes
          @values_hashes || recalculate_values_hashes
        end

        # Detect which columns have been modified by comparing the cached hash
        # value to the hash of the current value.
        def changed_columns
          changed = super
          if vh = @values_hashes
            values = @values
            changed = changed.dup if frozen?
            vh.each do |c, v|
              match = values.has_key?(c) && v == values[c].hash
              if changed.include?(c)
                changed.delete(c) if match
              else
                changed << c unless match
              end
            end
          end
          changed
        end

        private

        # Recalculate the column value hashes after manually refreshing.
        def _refresh(dataset)
          super
          recalculate_values_hashes
        end

        # Recalculate the column value hashes after refreshing after saving a new object.
        def _save_refresh
          super
          recalculate_values_hashes
        end

        # Recalculate the column value hashes, caching them for later use.
        def recalculate_values_hashes
          vh = {}
          @values.each do |k,v|
            vh[k] = v.hash
          end
          @values_hashes = vh.freeze
        end
      end
    end
  end
end
