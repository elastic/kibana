# frozen-string-literal: true

module Sequel
  module Plugins
    # The validation_contexts plugin adds support for a validation_context method inside a validate
    # method.  You pass in the validation context to use via the :validation_context option to
    # Sequel::Model#save && Sequel::Model#valid?:
    #
    #   class Album < Sequel::Model
    #     plugin :validation_contexts
    #     def validate
    #       super
    #       errors.add(:status_id, 'not 1') if status_id != 1 && validation_context == :initial
    #       errors.add(:status_id, 'not 2') if status_id != 2 && validation_context == :approve
    #     end
    #   end
    #
    #   Album.new(status_id: 1).valid?(validation_context: :initial) # => true
    #   Album.new(status_id: 2).valid?(validation_context: :initial) # => false
    #
    #   Album.new(status_id: 1).valid?(validation_context: :approve) # => false
    #   Album.new(status_id: 2).valid?(validation_context: :approve) # => true
    #
    # There is no validation context used by default, so validation_context will be
    # +nil+ if one is not specified.  If you want to differentiate between creating new
    # objects and updating existing objects, just use +new?+.
    #
    # Once this plugin is loaded into a model, after you freeze an instance
    # of that model, you can no longer specify a validation context when
    # validating the instance.
    module ValidationContexts
      module InstanceMethods 
        # The validation context to use for the current validation.
        # Set via the :validation_context option passed to save/valid?.
        attr_reader :validation_context

        private

        # Set validation context before running validations
        def _valid?(opts)
          @validation_context = opts[:validation_context] if opts[:validation_context]
          super
        ensure
          @validation_context = nil if @validation_context
        end
      end
    end
  end
end
