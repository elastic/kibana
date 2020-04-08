# frozen-string-literal: true

module Sequel
  module Plugins
    # The whitelist_security plugin contains whitelist-based support for
    # mass assignment, explicitly specifying which columns to allow mass assignment for,
    # disallowing mass assignment for columns not listed.  This exists mostly for backwards
    # compatibility, it's best to use Sequel::Model#set_fields and Sequel::Model#update_fields
    # to decide which fields to allow on a per-call basis.
    #
    # Usage:
    #
    #   # Make all model subclasses support allowed_columns 
    #   Sequel::Model.plugin :whitelist_security
    #
    #   # Make the Album class support allowed_columns
    #   Album.plugin :whitelist_security
    module WhitelistSecurity
      module ClassMethods
        # Which columns should be the only columns allowed in a call to a mass assignment method (e.g. set)
        # (default: not set, so all columns not otherwise restricted are allowed).
        attr_reader :allowed_columns
  
        Plugins.inherited_instance_variables(self, :@allowed_columns=>:dup)

        # Freeze allowed columns when freezing model class.
        def freeze
          @allowed_columns.freeze
          super
        end

        # Set the columns to allow when using mass assignment (e.g. +set+).  Using this means that
        # any columns not listed here will not be modified.  If you have any virtual
        # setter methods (methods that end in =) that you want to be used during
        # mass assignment, they need to be listed here as well (without the =).
        #
        # It may be better to use +set_fields+ which lets you specify
        # the allowed fields per call.
        #
        #   Artist.set_allowed_columns(:name, :hometown)
        #   Artist.set(name: 'Bob', hometown: 'Sactown') # No Error
        #   Artist.set(name: 'Bob', records_sold: 30000) # Error
        def set_allowed_columns(*cols)
          clear_setter_methods_cache
          @allowed_columns = cols
        end
  
        private

        # If allowed_columns is set, only allow those columns.
        def get_setter_methods
          if allowed_columns
            allowed_columns.map{|x| "#{x}="}
          else
            super
          end
        end
      end

      module InstanceMethods
        # Set all values using the entries in the hash, ignoring any setting of
        # allowed_columns in the model.
        #
        #   Artist.set_allowed_columns(:num_albums)
        #   artist.set_all(name: 'Jim')
        #   artist.name # => 'Jim'
        def set_all(hash)
          set_restricted(hash, :all)
        end
  
        # Set the values using the entries in the hash, only if the key
        # is included in only.  It may be a better idea to use +set_fields+
        # instead of this method.
        #
        #   artist.set_only({name: 'Jim'}, :name)
        #   artist.name # => 'Jim'
        #
        #   artist.set_only({hometown: 'LA'}, :name) # Raise Error
        def set_only(hash, *only)
          set_restricted(hash, only.flatten)
        end
  
        # Update all values using the entries in the hash, ignoring any setting of
        # +allowed_columns+ in the model.
        #
        #   Artist.set_allowed_columns(:num_albums)
        #   artist.update_all(name: 'Jim') # UPDATE artists SET name = 'Jim' WHERE (id = 1)
        def update_all(hash)
          update_restricted(hash, :all)
        end
  
        # Update the values using the entries in the hash, only if the key
        # is included in only.  It may be a better idea to use +update_fields+
        # instead of this method.
        #
        #   artist.update_only({name: 'Jim'}, :name)
        #   # UPDATE artists SET name = 'Jim' WHERE (id = 1)
        #
        #   artist.update_only({hometown: 'LA'}, :name) # Raise Error
        def update_only(hash, *only)
          update_restricted(hash, only.flatten)
        end
      
        private

        # If allowed_columns is set and set/update is called, only allow those columns.
        def setter_methods(type)
          if type == :default && model.allowed_columns
            model.setter_methods
          elsif type.is_a?(Array)
            type.map{|x| "#{x}="}
          elsif type == :all && primary_key && model.restrict_primary_key?
            super + Array(primary_key).map{|x| "#{x}="}
          else
            super
          end
        end
      end
    end
  end
end

