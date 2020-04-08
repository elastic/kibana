# frozen-string-literal: true

module Sequel
  module Plugins
    # The update_or_create plugin adds methods that make it easier
    # to deal with objects which may or may not yet exist in the database.
    # The first method is update_or_create, which updates an object if it
    # exists in the database, or creates the object if it does not.
    #
    # You can call update_or_create with a block:
    #
    #   Album.update_or_create(name: 'Hello') do |album|
    #     album.num_copies_sold = 1000
    #   end
    #
    # or provide two hashes, with the second one being the attributes
    # to set.
    #
    #   Album.update_or_create({name: 'Hello'}, num_copies_sold: 1000)
    #
    # In both cases, this will check the database to find the album with
    # the name "Hello". If such an album exists, it will be updated to set
    # num_copies_sold to 1000.  If no such album exists, an album with the
    # name "Hello" and num_copies_sold 1000 will be created.
    #
    # The second method is find_or_new, which returns the object from the
    # database if it exists, or returns a new (unsaved) object if not. It
    # has the same API as update_or_create, and operates identically to
    # update_or_create except that it doesn't persist any changes.
    #
    # Usage:
    #
    #   # Make all model subclass support update_or_create
    #   Sequel::Model.plugin :update_or_create
    #
    #   # Make the Album class support update_or_create
    #   Album.plugin :update_or_create
    module UpdateOrCreate
      module ClassMethods
        # Attempt to find an record with the +attrs+, which should be a
        # hash with column symbol keys.  If such an record exists, update it
        # with the values given in +set_attrs+.  If no such record exists,
        # create a new record with the columns specified by both +attrs+ and
        # +set_attrs+, with the ones in +set_attrs+ taking priority.  If
        # a block is given, the object is yielded to the block before the
        # object is saved.  Returns the new or updated object.
        def update_or_create(attrs, set_attrs=nil, &block)
          obj = find_or_new(attrs, set_attrs, &block)
          obj.save_changes
          obj
        end

        # Operates the same as +update_or_create+, but returns the objects
        # without persisting changes (no UPDATE/INSERT queries).
        def find_or_new(attrs, set_attrs=nil)
          obj = find(attrs) || new(attrs)
          obj.set(set_attrs) if set_attrs
          yield obj if block_given?
          obj
        end
      end
    end
  end
end
