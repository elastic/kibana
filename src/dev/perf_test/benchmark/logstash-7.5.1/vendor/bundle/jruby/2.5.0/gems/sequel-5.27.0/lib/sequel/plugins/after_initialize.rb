# frozen-string-literal: true

module Sequel
  module Plugins
    # Adds an after_initialize hook to models, called after initializing
    # both new objects and ones loaded from the database.
    #
    # Usage:
    #
    #   # Make all model subclasses support the after_initialize hook
    #   Sequel::Model.plugin :after_initialize
    #
    #   # Make the Album class support the after_initialize hook
    #   Album.plugin :after_initialize
    module AfterInitialize
      module ClassMethods
        # Call after_initialize for model objects loaded from the database.
        def call(_)
          v = super
          v.after_initialize
          v
        end
      end

      module InstanceMethods
        # Call after_initialize for new model objects.
        def initialize(h={})
          super
          after_initialize
        end
       
        # An empty after_initialize hook, so that plugins that use this
        # can always call super to get the default behavior.
        def after_initialize
        end
      end
    end
  end
end
