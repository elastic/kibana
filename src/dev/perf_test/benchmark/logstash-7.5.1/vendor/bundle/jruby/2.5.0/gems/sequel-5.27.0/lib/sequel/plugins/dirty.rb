# frozen-string-literal: true

module Sequel
  module Plugins
    # The dirty plugin makes Sequel save the initial value of
    # a column when setting a new value for the column.  This
    # makes it easier to see what changes were made to the object:
    #
    #   artist.name                   # => 'Foo'
    #   artist.name = 'Bar'
    #   artist.initial_value(:name)   # 'Foo'
    #   artist.column_change(:name)   # ['Foo', 'Bar']
    #   artist.column_changes         # {:name => ['Foo', 'Bar']}
    #   artist.column_changed?(:name) # true
    #   artist.reset_column(:name)
    #   artist.name                   # => 'Foo'
    #   artist.column_changed?(:name) # false
    #
    # It also makes changed_columns more accurate in that it
    # can detect when a the column value is changed and then
    # changed back:
    #
    #   artist.name                   # => 'Foo'
    #   artist.name = 'Bar'
    #   artist.changed_columns        # => [:name]
    #   artist.name = 'Foo'
    #   artist.changed_columns        # => []
    #
    # It can handle situations where a column value is
    # modified in place:
    #
    #   artist.will_change_column(:name)
    #   artist.name.gsub!(/o/, 'u')
    #   artist.changed_columns       # => [:name]
    #   artist.initial_value(:name)  # => 'Foo'
    #   artist.column_change(:name)  # => ['Foo', 'Fuu']
    #
    # It also saves the previously changed values after an update:
    #
    #   artist.update(:name=>'Bar')
    #   artist.column_changes        # => {}
    #   artist.previous_changes      # => {:name=>['Foo', 'Bar']}
    #
    # There is one caveat; when used with a column that also uses the
    # serialization plugin, setting the column back to its original value
    # after changing it is not correctly detected and will leave an entry
    # in changed_columns.
    #
    # Usage:
    #
    #   # Make all model subclass instances record previous values (called before loading subclasses)
    #   Sequel::Model.plugin :dirty
    #
    #   # Make the Album class record previous values
    #   Album.plugin :dirty
    module Dirty
      module InstanceMethods
        # A hash of previous changes before the object was
        # saved, in the same format as #column_changes.
        # Note that this is not necessarily the same as the columns
        # that were used in the update statement.
        attr_reader :previous_changes

        # An array with the initial value and the current value
        # of the column, if the column has been changed.  If the
        # column has not been changed, returns nil.
        #
        #   column_change(:name) # => ['Initial', 'Current']
        def column_change(column)
          [initial_value(column), get_column_value(column)] if column_changed?(column)
        end

        # A hash with column symbol keys and pairs of initial and
        # current values for all changed columns.
        #
        #   column_changes # => {:name => ['Initial', 'Current']}
        def column_changes
          h = {}
          initial_values.each do |column, value|
            h[column] = [value, get_column_value(column)]
          end
          h
        end

        # Either true or false depending on whether the column has
        # changed.  Note that this is not exactly the same as checking if
        # the column is in changed_columns, if the column was not set
        # initially.
        #
        #   column_changed?(:name) # => true
        def column_changed?(column)
          initial_values.has_key?(column)
        end

        # Freeze internal data structures
        def freeze
          initial_values.freeze
          missing_initial_values.freeze
          @previous_changes.freeze if @previous_changes
          super
        end

        # The initial value of the given column.  If the column value has
        # not changed, this will be the same as the current value of the
        # column.
        #
        #   initial_value(:name) # => 'Initial'
        def initial_value(column)
          initial_values.fetch(column){get_column_value(column)}
        end

        # A hash with column symbol keys and initial values.
        #
        #   initial_values # {:name => 'Initial'}
        def initial_values
          @initial_values ||= {}
        end

        # Reset the column to its initial value.  If the column was not set
        # initial, removes it from the values.
        #
        #   reset_column(:name)
        #   name # => 'Initial'
        def reset_column(column)
          if initial_values.has_key?(column)
            set_column_value(:"#{column}=", initial_values[column])
          end
          if missing_initial_values.include?(column)
            values.delete(column)
          end
        end

        # Manually specify that a column will change.  This should only be used
        # if you plan to modify a column value in place, which is not recommended.
        #
        #   will_change_column(:name)
        #   name.gsub(/i/i, 'o')
        #   column_change(:name) # => ['Initial', 'onotoal']
        def will_change_column(column)
          _add_changed_column(column)
          check_missing_initial_value(column)

          value = if initial_values.has_key?(column)
            initial_values[column]
          else
            get_column_value(column)
          end

          initial_values[column] = if value && value != true && value.respond_to?(:clone)
            begin
              value.clone
            rescue TypeError
              value
            end
          else
            value
          end
        end

        private

        # Reset initial values when clearing changed columns
        def _clear_changed_columns(reason)
          reset_initial_values if reason == :initialize || reason == :refresh
          super
        end

        # Reset the initial values after saving.
        def after_save
          super
          reset_initial_values
        end

        # Save the current changes so they are available after updating.  This happens
        # before after_save resets them.
        def after_update
          super
          @previous_changes = column_changes
        end

        # When changing the column value, save the initial column value.  If the column
        # value is changed back to the initial value, update changed columns to remove
        # the column.
        def change_column_value(column, value)
          if (iv = initial_values).has_key?(column)
            initial = iv[column]
            super
            if value == initial
              _changed_columns.delete(column) unless missing_initial_values.include?(column)
              iv.delete(column)
            end
          else
            check_missing_initial_value(column)
            iv[column] = get_column_value(column)
            super
          end
        end

        # If the values hash does not contain the column, make sure missing_initial_values
        # does so that it doesn't get deleted from changed_columns if changed back,
        # and so that resetting the column value can be handled correctly.
        def check_missing_initial_value(column)
          unless values.has_key?(column) || (miv = missing_initial_values).include?(column)
            miv << column
          end
        end

        # Duplicate internal data structures
        def initialize_copy(other)
          super
          @initial_values = Hash[other.initial_values]
          @missing_initial_values = other.send(:missing_initial_values).dup
          @previous_changes = Hash[other.previous_changes] if other.previous_changes
          self
        end

        # Array holding column symbols that were not present initially.  This is necessary
        # to differentiate between values that were not present and values that were
        # present but equal to nil.
        def missing_initial_values
          @missing_initial_values ||= []
        end

        # Clear the data structures that store the initial values.
        def reset_initial_values
          @initial_values.clear if @initial_values
          @missing_initial_values.clear if @missing_initial_values
        end
      end
    end
  end
end
