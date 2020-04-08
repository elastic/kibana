# frozen-string-literal: true

module Sequel
  module Plugins
    # The split_values plugin splits the values hash retreived from the
    # database, and moves keys from the values hash that are not columns
    # in the model's dataset to a separate hash.  This makes it so the
    # values hash only stores columns from the model's dataset.
    #
    # Among other things, this allows you to save model objects even if
    # they were retrieved with additional columns, and have equality
    # comparisons with other instances not care about non-column values.
    #
    # Example:
    #
    #   class Album < Sequel::Model
    #     plugin :split_values
    #   end
    #   a1 = Album[1]
    #   a2 = Album.select_append(Sequel.as(true, :exists))[1]
    #   a1.name # => 'Album Name'
    #   a2.name # => 'Album Name'
    #   a1[:exists] # => nil
    #   a2[:exists] # => true
    #   a1 == a2 # => true
    #   a2.values # => {:id=>1, :name=>'Album Name'}
    #   a2.save # Works
    # 
    # Usage:
    #
    #   # Make all model subclass instances split values
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :split_values
    #
    #   # Make the Album class split values
    #   Album.plugin :split_values
    module SplitValues
      module ClassMethods
        # Split the noncolumn values when creating a new object retrieved from
        # the database.
        def call(_)
          super.split_noncolumn_values
        end
      end

      module InstanceMethods
        # If there isn't an entry in the values hash, but there is a noncolumn_values
        # hash, look in that hash for the value.
        def [](k)
          if  (res = super).nil?
            @noncolumn_values[k] if !@values.has_key?(k) && @noncolumn_values
          else
            res
          end
        end

        # Check all entries in the values hash.  If any of the keys are not columns,
        # move the entry into the noncolumn_values hash.
        def split_noncolumn_values
          cols = (@values.keys - columns)
          return self if cols.empty?

          nc = @noncolumn_values ||= {}
          vals = @values
          cols.each{|k| nc[k] = vals.delete(k)}
          self
        end
      end
    end
  end
end
