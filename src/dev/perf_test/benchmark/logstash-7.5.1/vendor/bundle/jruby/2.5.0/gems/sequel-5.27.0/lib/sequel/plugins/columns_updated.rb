# frozen-string-literal: true

module Sequel
  module Plugins
    # The columns_updated plugin stores the columns hash used in the
    # UPDATE query when saving the instance, and makes it available
    # in the after_update and after_save hooks via the +columns_updated+
    # accessor.  The data is cleared before returning from +save+.
    #
    # Usage:
    #
    #   # Make all model subclasses store the columns hash used for updating
    #   Sequel::Model.plugin :columns_updated
    #
    #   # Make the Album class store the columns hash used for updating
    #   Album.plugin :columns_updated
    module ColumnsUpdated
      module InstanceMethods
        private

        # The hash used for updating records.  This should only be called
        # in the after_update and after_save hooks.
        attr_reader :columns_updated

        # Store the hash used for updating the record, so it can be accessed
        # in the after_hooks.
        def _update_columns(columns_updated)
          @columns_updated = columns_updated
          super
        end

        # Unset the updated columns hash before returning from save.
        def _save(opts)
          super
        ensure
          @columns_updated = nil
        end
      end
    end
  end
end

