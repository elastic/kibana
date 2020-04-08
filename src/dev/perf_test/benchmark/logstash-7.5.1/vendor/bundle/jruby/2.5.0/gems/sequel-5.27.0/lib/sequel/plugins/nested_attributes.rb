# frozen-string-literal: true

module Sequel
  module Plugins
    # The nested_attributes plugin allows you to create, update, and delete
    # associated objects directly by calling a method on the current object.
    # Nested attributes are defined using the nested_attributes class method:
    #
    #   Artist.one_to_many :albums
    #   Artist.plugin :nested_attributes
    #   Artist.nested_attributes :albums
    #
    # The nested_attributes call defines a single method, <tt><i>association</i>_attributes=</tt>,
    # (e.g. <tt>albums_attributes=</tt>).  So if you have an Artist instance:
    #
    #   a = Artist.new(name: 'YJM')
    #
    # You can create new album instances related to this artist:
    #
    #   a.albums_attributes = [{name: 'RF'}, {name: 'MO'}]
    #
    # Note that this doesn't send any queries to the database yet.  That doesn't happen till
    # you save the object:
    #
    #   a.save
    #
    # That will save the artist first, and then save both albums.  If either the artist
    # is invalid or one of the albums is invalid, none of the objects will be saved to the
    # database, and all related validation errors will be available in the artist's validation
    # errors.
    #
    # In addition to creating new associated objects, you can also update existing associated
    # objects.  You just need to make sure that the primary key field is filled in for the
    # associated object:
    #
    #   a.update(:albums_attributes => [{id: 1, name: 'T'}])
    #
    # Since the primary key field is filled in, the plugin will update the album with id 1 instead
    # of creating a new album.
    #
    # If you would like to delete the associated object instead of updating it, you add a _delete
    # entry to the hash, and also pass the :destroy option when calling +nested_attributes+:
    #
    #   Artist.nested_attributes :albums, destroy: true
    #   a.update(:albums_attributes => [{id: 1, _delete: true}])
    #
    # This will delete the related associated object from the database.  If you want to leave the
    # associated object in the database, but just remove it from the association, add a _remove
    # entry in the hash, and also pass the :remove option when calling +nested_attributes+:
    #
    #   Artist.nested_attributes :albums, remove: true
    #   a.update(:albums_attributes => [{id: 1, _remove: true}])
    #
    # The above example was for a one_to_many association, but the plugin also works similarly
    # for other association types.  For one_to_one and many_to_one associations, you need to
    # pass a single hash instead of an array of hashes.
    #
    # This plugin is mainly designed to make it easy to use on html forms, where a single form
    # submission can contained nested attributes (and even nested attributes of those attributes).
    # You just need to name your form inputs correctly:
    #
    #   artist[name]
    #   artist[albums_attributes][0][:name]
    #   artist[albums_attributes][1][:id]
    #   artist[albums_attributes][1][:name]
    #
    # Your web stack will probably parse that into a nested hash similar to:
    #
    #   {'artist'=>{'name'=>'Y', 'albums_attributes'=>{'0'=>{'name'=>'X'}, '1'=>{'id'=>'2', 'name'=>'Z'}}}}
    #
    # Then you can do:
    #
    #   artist.update_fields(params['artist'], %w'name albums_attributes')
    #
    # Note that Rails 5+ does not use a Hash for submitted parameters, and therefore
    # the above will not work.  With Rails 5+, you have to use:
    #
    #   artist.update_fields(params.to_unsafe_h['artist'], %w'name albums_attributes')
    #
    # To save changes to the artist, create the first album and associate it to the artist,
    # and update the other existing associated album.
    #
    # You can pass options for individual nested attributes, which will override the default
    # nested attributes options for that association.  This is useful for per-call filtering
    # of the allowed fields:
    #
    #   a.set_nested_attributes(:albums, params['artist'], :fields=>%w'name')
    module NestedAttributes
      # Depend on the validate_associated plugin.
      def self.apply(model)
        model.plugin(:validate_associated)
      end
      
      module ClassMethods
        # Freeze nested_attributes_module when freezing model class.
        def freeze
          @nested_attributes_module.freeze if @nested_attributes_module

          super
        end

        # Allow nested attributes to be set for the given associations.  Options:
        # :destroy :: Allow destruction of nested records.
        # :fields :: If provided, should be an Array or proc. If it is an array,
        #            restricts the fields allowed to be modified through the
        #            association_attributes= method to the specific fields given. If it is
        #            a proc, it will be called with the associated object and should return an
        #            array of the allowable fields.
        # :limit :: For *_to_many associations, a limit on the number of records
        #           that will be processed, to prevent denial of service attacks.
        # :reject_if :: A proc that is given each attribute hash before it is
        #               passed to its associated object. If the proc returns a truthy
        #               value, the attribute hash is ignored.
        # :remove :: Allow disassociation of nested records (can remove the associated
        #            object from the parent object, but not destroy the associated object).
        # :require_modification :: Whether to require modification of nested objects when
        #                          updating or deleting them (checking that a single row was
        #                          updated).  By default, uses the default require_modification
        #                          setting for the nested object.
        # :transform :: A proc to transform attribute hashes before they are
        #               passed to associated object. Takes two arguments, the parent object and
        #               the attribute hash. Uses the return value as the new attribute hash.
        # :unmatched_pk :: Specify the action to be taken if a primary key is
        #                  provided in a record, but it doesn't match an existing associated
        #                  object. Set to :create to create a new object with that primary
        #                  key, :ignore to ignore the record, or :raise to raise an error.
        #                  The default is :raise.
        #
        # If a block is provided, it is used to set the :reject_if option.
        def nested_attributes(*associations, &block)
          include(@nested_attributes_module ||= Module.new) unless @nested_attributes_module
          opts = associations.last.is_a?(Hash) ? associations.pop : OPTS
          reflections = associations.map{|a| association_reflection(a) || raise(Error, "no association named #{a} for #{self}")}
          reflections.each do |r|
            r[:nested_attributes] = opts.dup
            r[:nested_attributes][:unmatched_pk] ||= :raise
            r[:nested_attributes][:reject_if] ||= block
            def_nested_attribute_method(r)
          end
        end
        
        private
        
        # Add a nested attribute setter method to a module included in the
        # class.
        def def_nested_attribute_method(reflection)
          @nested_attributes_module.class_eval do
            define_method("#{reflection[:name]}_attributes=") do |v|
              set_nested_attributes(reflection[:name], v)
            end
          end
        end
      end
      
      module InstanceMethods
        # Set the nested attributes for the given association.  obj should be an enumerable of multiple objects
        # for plural associations.  The opts hash can be used to override any of the default options set by
        # the class-level nested_attributes call.
        def set_nested_attributes(assoc, obj, opts=OPTS)
          raise(Error, "no association named #{assoc} for #{model.inspect}") unless ref = model.association_reflection(assoc)
          raise(Error, "nested attributes are not enabled for association #{assoc} for #{model.inspect}") unless meta = ref[:nested_attributes]
          meta = meta.merge(opts)
          meta[:reflection] = ref
          if ref.returns_array?
            nested_attributes_list_setter(meta, obj)
          else
            nested_attributes_setter(meta, obj)
          end
        end

        private
        
        # Check that the keys related to the association are not modified inside the block.  Does
        # not use an ensure block, so callers should be careful.
        def nested_attributes_check_key_modifications(meta, obj)
          reflection = meta[:reflection]
          keys = reflection.associated_object_keys.map{|x| obj.get_column_value(x)}
          yield
          unless keys == reflection.associated_object_keys.map{|x| obj.get_column_value(x)}
            raise(Error, "Modifying association dependent key(s) when updating associated objects is not allowed")
          end
        end
        
        # Create a new associated object with the given attributes, validate
        # it when the parent is validated, and save it when the object is saved.
        # Returns the object created.
        def nested_attributes_create(meta, attributes)
          reflection = meta[:reflection]
          obj = reflection.associated_class.new
          nested_attributes_set_attributes(meta, obj, attributes)
          delay_validate_associated_object(reflection, obj)
          if reflection.returns_array?
            public_send(reflection[:name]) << obj
            obj.skip_validation_on_next_save!
            after_save_hook{public_send(reflection[:add_method], obj)}
          else
            associations[reflection[:name]] = obj

            # Because we are modifying the associations cache manually before the
            # setter is called, we still want to run the setter code even though
            # the cached value will be the same as the given value.
            @set_associated_object_if_same = true

            # Don't need to validate the object twice if :validate association option is not false
            # and don't want to validate it at all if it is false.
            if reflection[:type] == :many_to_one 
              before_save_hook{public_send(reflection[:setter_method], obj.save(:validate=>false))}
            else
              after_save_hook do
                obj.skip_validation_on_next_save!
                public_send(reflection[:setter_method], obj)
              end
            end
          end
          add_reciprocal_object(reflection, obj)
          obj
        end
        
        # Take an array or hash of attribute hashes and set each one individually.
        # If a hash is provided it, sort it by key and then use the values.
        # If there is a limit on the nested attributes for this association,
        # make sure the length of the attributes_list is not greater than the limit.
        def nested_attributes_list_setter(meta, attributes_list)
          attributes_list = attributes_list.sort.map{|k,v| v} if attributes_list.is_a?(Hash)
          if (limit = meta[:limit]) && attributes_list.length > limit
            raise(Error, "number of nested attributes (#{attributes_list.length}) exceeds the limit (#{limit})")
          end
          attributes_list.each{|a| nested_attributes_setter(meta, a)}
        end
        
        # Remove the given associated object from the current object. If the
        # :destroy option is given, destroy the object after disassociating it
        # (unless destroying the object would automatically disassociate it).
        # Returns the object removed.
        def nested_attributes_remove(meta, obj, opts=OPTS)
          reflection = meta[:reflection]
          if !opts[:destroy] || reflection.remove_before_destroy?
            before_save_hook do
              if reflection.returns_array?
                public_send(reflection[:remove_method], obj)
              else
                public_send(reflection[:setter_method], nil)
              end
            end
          end
          after_save_hook{obj.destroy} if opts[:destroy]
          if reflection.returns_array?
            associations[reflection[:name]].delete(obj)
          end
          obj
        end
        
        # Set the fields in the obj based on the association, only allowing
        # specific :fields if configured.
        def nested_attributes_set_attributes(meta, obj, attributes)
          if fields = meta[:fields]
            fields = fields.call(obj) if fields.respond_to?(:call)
            obj.set_fields(attributes, fields, :missing=>:skip)
          else
            obj.set(attributes)
          end
        end

        # Modify the associated object based on the contents of the attributes hash:
        # * If a :transform block was given to nested_attributes, use it to modify the attribute hash.
        # * If a block was given to nested_attributes, call it with the attributes and return immediately if the block returns true.
        # * If a primary key exists in the attributes hash and it matches an associated object:
        # ** If _delete is a key in the hash and the :destroy option is used, destroy the matching associated object.
        # ** If _remove is a key in the hash and the :remove option is used, disassociated the matching associated object.
        # ** Otherwise, update the matching associated object with the contents of the hash.
        # * If a primary key exists in the attributes hash but it does not match an associated object,
        #   either raise an error, create a new object or ignore the hash, depending on the :unmatched_pk option.
        # * If no primary key exists in the attributes hash, create a new object.
        def nested_attributes_setter(meta, attributes)
          if a = meta[:transform]
            attributes = a.call(self, attributes)
          end
          return if (b = meta[:reject_if]) && b.call(attributes)
          modified!
          reflection = meta[:reflection]
          klass = reflection.associated_class
          sym_keys = Array(klass.primary_key)
          str_keys = sym_keys.map(&:to_s)
          if (pk = attributes.values_at(*sym_keys)).all? || (pk = attributes.values_at(*str_keys)).all?
            pk = pk.map(&:to_s)
            obj = Array(public_send(reflection[:name])).find{|x| Array(x.pk).map(&:to_s) == pk}
          end
          if obj
            unless (require_modification = meta[:require_modification]).nil?
              obj.require_modification = require_modification
            end
            attributes = attributes.dup.delete_if{|k,v| str_keys.include? k.to_s}
            if meta[:destroy] && klass.db.send(:typecast_value_boolean, attributes.delete(:_delete) || attributes.delete('_delete'))
              nested_attributes_remove(meta, obj, :destroy=>true)
            elsif meta[:remove] && klass.db.send(:typecast_value_boolean, attributes.delete(:_remove) || attributes.delete('_remove'))
              nested_attributes_remove(meta, obj)
            else
              nested_attributes_update(meta, obj, attributes)
            end
          elsif pk.all? && meta[:unmatched_pk] != :create
            if meta[:unmatched_pk] == :raise
              raise(Error, "no matching associated object with given primary key (association: #{reflection[:name]}, pk: #{pk})")
            end
          else
            nested_attributes_create(meta, attributes)
          end
        end
        
        # Update the given object with the attributes, validating it when the
        # parent object is validated and saving it when the parent is saved.
        # Returns the object updated.
        def nested_attributes_update(meta, obj, attributes)
          nested_attributes_update_attributes(meta, obj, attributes)
          delay_validate_associated_object(meta[:reflection], obj)
          # Don't need to validate the object twice if :validate association option is not false
          # and don't want to validate it at all if it is false.
          after_save_hook{obj.save_changes(:validate=>false)}
          obj
        end

        # Update the attributes for the given object related to the current object through the association.
        def nested_attributes_update_attributes(meta, obj, attributes)
          nested_attributes_check_key_modifications(meta, obj) do
            nested_attributes_set_attributes(meta, obj, attributes)
          end
        end
      end
    end
  end
end
