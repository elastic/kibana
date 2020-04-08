# frozen-string-literal: true

module Sequel
  module Plugins
    # The error_splitter plugin automatically splits errors entries related to
    # multiple columns to have separate error entries, one per column.  For example,
    # a multiple column uniqueness entry:
    #
    #   validates_unique([:artist_id, :name])
    #
    # would by default result in errors entries such as:
    #
    #   {[:artist_id, :name]=>'is already taken'}
    #
    # This plugin transforms those errors into:
    #
    #   {:artist_id=>'is already taken', :name=>'is already taken'}
    #
    # The main reason to split errors is if you have a list of fields that you
    # are checking for validation errors.  If you don't split the errors, then:
    #
    #   errors.on(:artist_id)
    #
    # would not return the uniqueness error.
    # 
    # Usage:
    #
    #   # Make all model subclass instances split errors (called before loading subclasses)
    #   Sequel::Model.plugin :error_splitter
    #
    #   # Make the Album class split errors
    #   Album.plugin :error_splitter
    module ErrorSplitter
      module InstanceMethods
        private

        # If the model instance is not valid, split the errors before returning.
        def _valid?(opts)
          v = super
          unless v
            split_validation_errors(errors)
          end
          v
        end

        # Go through all of the errors entries.  For any that apply to multiple columns,
        # remove them and add separate error entries, one per column.
        def split_validation_errors(errors)
          errors.keys.select{|k| k.is_a?(Array)}.each do |ks|
            msgs = errors.delete(ks)
            ks.each do |k|
              msgs.each do |msg|
                errors.add(k, msg)
              end
            end
          end
        end
      end
    end
  end
end
