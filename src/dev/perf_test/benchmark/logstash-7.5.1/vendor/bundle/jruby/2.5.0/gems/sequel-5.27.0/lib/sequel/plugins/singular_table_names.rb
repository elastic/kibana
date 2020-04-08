# frozen-string-literal: true

module Sequel
  module Plugins
    # The singular_table_names plugin changes the default
    # table names for subclasses to not assume a plural version.
    # By default, Sequel assumes table names for models use
    # the plural versions.
    #
    # Note that this plugin only affects subclasses of the
    # class it is loaded into, it does not affect the
    # current class.  So it only makes sense to load this
    # into Sequel::Model itself, or a subclass of Sequel::Model
    # that is created via Class.new.
    #
    # Usage:
    #
    #   # Don't assume pluralized table names
    #   Sequel::Model.plugin :singular_table_names
    module SingularTableNames
      module ClassMethods
        # Returns the implicit table name for the model class, which is the demodulized,
        # underscored, name of the class.
        #
        #   Artist.implicit_table_name # => :artist
        #   Foo::ArtistAlias.implicit_table_name # => :artist_alias
        def implicit_table_name
          underscore(demodulize(name)).to_sym
        end
      end
    end
  end
end
