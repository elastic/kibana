# frozen-string-literal: true

module Sequel
  module Plugins
    # The unlimited_update plugin is designed to work around a
    # MySQL warning in replicated environments, which occurs if
    # you issue an UPDATE with a LIMIT clause.
    #
    # Usage:
    #
    #   # Make all model subclass not use a limit for update
    #   Sequel::Model.plugin :unlimited_update
    #
    #   # Make the Album class not use a limit for update
    #   Album.plugin :unlimited_update
    module UnlimitedUpdate
      module InstanceMethods
        private

        # Use an unlimited dataset for updates.
        def _update_dataset
          super.unlimited
        end
      end
    end
  end
end
