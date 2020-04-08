# frozen-string-literal: true

module Sequel
  extension :pg_array, :pg_array_ops

  module Plugins
    # This plugin allows you to create associations where the foreign keys
    # are stored in a PostgreSQL array column in one of the tables.  The
    # model with the table containing the array column has a
    # pg_array_to_many association to the associated model, and the
    # model with the table containing the primary key referenced by
    # elements in the array column has a many_to_pg_array association
    # to the associated model.
    #
    #   # Database schema:
    #   #   tags                albums
    #   #   :id (int4) <--\    :id
    #   #   :name          \-- :tag_ids (int4[])
    #   #                      :name
    #
    #   class Album
    #     plugin :pg_array_associations
    #     pg_array_to_many :tags
    #   end
    #   class Tag
    #     plugin :pg_array_associations
    #     many_to_pg_array :albums
    #   end
    #
    # These association types work similarly to Sequel's other association
    # types, so you can use them as you would any other association. Unlike
    # other associations, they do not support composite keys.
    #
    # One thing that is different is that the modification methods for
    # pg_array_to_many associations do not affect the database, since they
    # operate purely on the receiver.  For example:
    #
    #   album = Album[1]
    #   album.add_tag(Tag[2])
    #
    # does not save the album.  This allows you to call add_tag repeatedly
    # and the save after to combine all changes into a single query.  Note
    # that the many_to_pg_array association modification methods do save, so:
    #
    #   tag = Tag[2]
    #   tag.add_album(Album[1])
    #
    # will save the changes to the album.
    #
    # They support some additional options specific to this plugin:
    #
    # :array_type :: This overrides the type of the array.  By default, the type
    #                is determined by looking at the db_schema for the model, and if that fails,
    #                it defaults to :integer.
    # :raise_on_save_failure :: Do not raise exceptions for hook or validation failures when saving associated
    #                           objects in the add/remove methods (return nil instead).
    # :save_after_modify :: For pg_array_to_many associations, this makes the
    #                       the modification methods save the current object,
    #                       so they operate more similarly to the one_to_many
    #                       and many_to_many association modification methods.
    # :uniq :: Similar to many_to_many associations, this can be used to
    #          make sure the returned associated object array has uniq values.
    #
    # Note that until PostgreSQL gains the ability to enforce foreign key
    # constraints in array columns, this plugin is not recommended for
    # production use unless you plan on emulating referential integrity
    # constraints via triggers.
    #
    # This plugin should work on all supported PostgreSQL versions, except
    # the remove_all modification method for many_to_pg_array associations, which
    # requires the array_remove method added in PostgreSQL 9.3.
    #
    # This plugin requires that the underlying database have the pg_array
    # extension loaded.
    module PgArrayAssociations
      # The AssociationReflection subclass for many_to_pg_array associations.
      class ManyToPgArrayAssociationReflection < Sequel::Model::Associations::AssociationReflection
        Sequel.synchronize{Sequel::Model::Associations::ASSOCIATION_TYPES[:many_to_pg_array] = self}

        def array_type
          cached_fetch(:array_type) do
            if (sch = associated_class.db_schema) && (s = sch[self[:key]]) && (t = s[:db_type])
              t.sub(/\[\]\z/, '').freeze
            else
              :integer
            end
          end
        end

        # The array column in the associated model containing foreign keys to
        # the current model.
        def associated_object_keys
          [self[:key]]
        end

        # many_to_pg_array associations can have associated objects as long as they have
        # a primary key.
        def can_have_associated_objects?(obj)
          obj.get_column_value(self[:primary_key])
        end

        # Assume that the key in the associated table uses a version of the current
        # model's name suffixed with _ids.
        def default_key
          :"#{underscore(demodulize(self[:model].name))}_ids"
        end
        
        # Always use the ruby eager_graph limit strategy if association is limited.
        def eager_graph_limit_strategy(_)
          :ruby if self[:limit]
        end

        # Always use the ruby eager limit strategy
        def eager_limit_strategy
          cached_fetch(:_eager_limit_strategy) do
            :ruby if self[:limit]
          end
        end

        # Don't use a filter by associations limit strategy
        def filter_by_associations_limit_strategy
          nil
        end

        FINALIZE_SETTINGS = superclass::FINALIZE_SETTINGS.merge(
          :array_type=>:array_type
        ).freeze
        def finalize_settings
          FINALIZE_SETTINGS
        end

        # Handle silent failure of add/remove methods if raise_on_save_failure is false.
        def handle_silent_modification_failure?
          self[:raise_on_save_failure] == false
        end

        # The hash key to use for the eager loading predicate (left side of IN (1, 2, 3))
        def predicate_key
          cached_fetch(:predicate_key){qualify_assoc(self[:key_column])}
        end
    
        # The column in the current table that the keys in the array column in the
        # associated table reference.
        def primary_key
          self[:primary_key]
        end

        # Destroying the associated object automatically removes the association,
        # since the association is stored in the associated object.
        def remove_before_destroy?
          false
        end
    
        private
    
        # The predicate condition to use for the eager_loader.
        def eager_loading_predicate_condition(keys)
          Sequel.pg_array_op(predicate_key).overlaps(Sequel.pg_array(keys, array_type))
        end

        def filter_by_associations_add_conditions_dataset_filter(ds)
          key = qualify(associated_class.table_name, self[:key])
          ds.cross_join(Sequel.function(:unnest, key).as(:_smtopgaa_, [:_smtopgaa_key_])).exclude(key=>nil).select(:_smtopgaa_key_)
        end
        
        def filter_by_associations_conditions_key
          qualify(self[:model].table_name, primary_key)
        end

        # Only consider an association as a reciprocal if it has matching keys
        # and primary keys.
        def reciprocal_association?(assoc_reflect)
          super && self[:key] == assoc_reflect[:key] && primary_key == assoc_reflect.primary_key
        end

        def reciprocal_type
          :pg_array_to_many
        end

        def use_placeholder_loader?
          false
        end
      end

      # The AssociationReflection subclass for pg_array_to_many associations.
      class PgArrayToManyAssociationReflection < Sequel::Model::Associations::AssociationReflection
        Sequel.synchronize{Sequel::Model::Associations::ASSOCIATION_TYPES[:pg_array_to_many] = self}

        def array_type
          cached_fetch(:array_type) do
            if (sch = self[:model].db_schema) && (s = sch[self[:key]]) && (t = s[:db_type])
              t.sub(/\[\]\z/, '').freeze
            else
              :integer
            end
          end
        end

        # An array containing the primary key for the associated model.
        def associated_object_keys
          Array(primary_key)
        end

        # pg_array_to_many associations can only have associated objects if
        # the array field is not nil or empty.
        def can_have_associated_objects?(obj)
          v = obj.get_column_value(self[:key])
          v && !v.empty?
        end

        # pg_array_to_many associations do not need a primary key.
        def dataset_need_primary_key?
          false
        end

        # Use a default key name of *_ids, for similarity to other association types
        # that use *_id for single keys.
        def default_key
          :"#{singularize(self[:name])}_ids"
        end

        # Always use the ruby eager_graph limit strategy if association is limited.
        def eager_graph_limit_strategy(_)
          :ruby if self[:limit]
        end

        # Always use the ruby eager limit strategy
        def eager_limit_strategy
          cached_fetch(:_eager_limit_strategy) do
            :ruby if self[:limit]
          end
        end

        # Don't use a filter by associations limit strategy
        def filter_by_associations_limit_strategy
          nil
        end

        FINALIZE_SETTINGS = superclass::FINALIZE_SETTINGS.merge(
          :array_type=>:array_type,
          :primary_key=>:primary_key,
          :primary_key_method=>:primary_key_method
        ).freeze
        def finalize_settings
          FINALIZE_SETTINGS
        end

        # Handle silent failure of add/remove methods if raise_on_save_failure is false
        # and save_after_modify is true.
        def handle_silent_modification_failure?
          self[:raise_on_save_failure] == false && self[:save_after_modify]
        end

        # A qualified version of the associated primary key.
        def predicate_key
          cached_fetch(:predicate_key){qualify_assoc(primary_key)}
        end
    
        # The primary key of the associated model.
        def primary_key
          cached_fetch(:primary_key){associated_class.primary_key || raise(Error, "no primary key specified for #{associated_class.inspect}")}
        end

        # The method to call to get value of the primary key of the associated model.
        def primary_key_method
          cached_fetch(:primary_key_method){primary_key}
        end

        def filter_by_associations_conditions_expression(obj)
          ds = filter_by_associations_conditions_dataset.where(filter_by_associations_conditions_subquery_conditions(obj))
          Sequel.function(:coalesce, Sequel.pg_array(filter_by_associations_conditions_key).overlaps(ds), Sequel::SQL::Constants::FALSE)
        end

        private
    
        def filter_by_associations_add_conditions_dataset_filter(ds)
          pk = qualify(associated_class.table_name, primary_key)
          ds.select{array_agg(pk)}.exclude(pk=>nil)
        end
        
        def filter_by_associations_conditions_key
          qualify(self[:model].table_name, self[:key])
        end

        # Only consider an association as a reciprocal if it has matching keys
        # and primary keys.
        def reciprocal_association?(assoc_reflect)
          super && self[:key] == assoc_reflect[:key] && primary_key == assoc_reflect.primary_key
        end

        def reciprocal_type
          :many_to_pg_array
        end

        def use_placeholder_loader?
          false
        end
      end

      # Add the pg_array extension to the database
      def self.apply(model)
        model.db.extension(:pg_array)
      end

      module ClassMethods
        # Create a many_to_pg_array association, for the case where the associated
        # table contains the array with foreign keys pointing to the current table.
        # See associate for options.
        def many_to_pg_array(name, opts=OPTS, &block)
          associate(:many_to_pg_array, name, opts, &block)
        end

        # Create a pg_array_to_many association, for the case where the current
        # table contains the array with foreign keys pointing to the associated table.
        # See associate for options.
        def pg_array_to_many(name, opts=OPTS, &block)
          associate(:pg_array_to_many, name, opts, &block)
        end

        private

        # Setup the many_to_pg_array-specific datasets, eager loaders, and modification methods.
        def def_many_to_pg_array(opts)
          name = opts[:name]
          model = self
          pk = opts[:eager_loader_key] = opts[:primary_key] ||= model.primary_key
          raise(Error, "no primary key specified for #{inspect}") unless pk
          opts[:key] = opts.default_key unless opts.has_key?(:key)
          key = opts[:key]
          key_column = opts[:key_column] ||= opts[:key]
          if opts[:uniq]
            opts[:after_load] ||= []
            opts[:after_load].unshift(:array_uniq!)
          end
          opts[:dataset] ||= lambda do
            opts.associated_dataset.where(Sequel.pg_array_op(opts.predicate_key).contains(Sequel.pg_array([get_column_value(pk)], opts.array_type)))
          end
          opts[:eager_loader] ||= proc do |eo|
            id_map = eo[:id_map]
            eo = Hash[eo]
            eo[:loader] = false

            eager_load_results(opts, eo) do |assoc_record|
              if pks ||= assoc_record.get_column_value(key)
                pks.each do |pkv|
                  next unless objects = id_map[pkv]
                  objects.each do |object| 
                    object.associations[name].push(assoc_record)
                  end
                end
              end
            end
          end

          join_type = opts[:graph_join_type]
          select = opts[:graph_select]
          opts[:cartesian_product_number] ||= 1

          if opts.include?(:graph_only_conditions)
            conditions = opts[:graph_only_conditions]
            graph_block = opts[:graph_block]
          else
            conditions = opts[:graph_conditions]
            conditions = nil if conditions.empty?
            graph_block = proc do |j, lj, js|
              Sequel.pg_array_op(Sequel.deep_qualify(j, key_column)).contains([Sequel.deep_qualify(lj, opts.primary_key)])
            end

            if orig_graph_block = opts[:graph_block]
              pg_array_graph_block = graph_block
              graph_block = proc do |j, lj, js|
                Sequel.&(orig_graph_block.call(j,lj,js), pg_array_graph_block.call(j, lj, js))
              end
            end
          end

          opts[:eager_grapher] ||= proc do |eo|
            ds = eo[:self]
            ds = ds.graph(eager_graph_dataset(opts, eo), conditions, eo.merge(:select=>select, :join_type=>eo[:join_type]||join_type, :qualify=>:deep), &graph_block)
            ds
          end

          return if opts[:read_only]

          save_opts = {:validate=>opts[:validate]}
          save_opts[:raise_on_failure] = opts[:raise_on_save_failure] != false

          opts[:adder] ||= proc do |o|
            if array = o.get_column_value(key)
              array << get_column_value(pk)
            else
              o.set_column_value("#{key}=", Sequel.pg_array([get_column_value(pk)], opts.array_type))
            end
            o.save(save_opts)
          end
  
          opts[:remover] ||= proc do |o|
            if (array = o.get_column_value(key)) && !array.empty?
              array.delete(get_column_value(pk))
              o.save(save_opts)
            end
          end

          opts[:clearer] ||= proc do
            pk_value = get_column_value(pk)
            db_type = opts.array_type
            opts.associated_dataset.where(Sequel.pg_array_op(key).contains(Sequel.pg_array([pk_value], db_type))).update(key=>Sequel.function(:array_remove, key, Sequel.cast(pk_value, db_type)))
          end
        end

        # Setup the pg_array_to_many-specific datasets, eager loaders, and modification methods.
        def def_pg_array_to_many(opts)
          name = opts[:name]
          opts[:key] = opts.default_key unless opts.has_key?(:key)
          key = opts[:key]
          key_column = opts[:key_column] ||= key
          opts[:eager_loader_key] = nil
          if opts[:uniq]
            opts[:after_load] ||= []
            opts[:after_load].unshift(:array_uniq!)
          end
          opts[:dataset] ||= lambda do
            opts.associated_dataset.where(opts.predicate_key=>get_column_value(key).to_a)
          end
          opts[:eager_loader] ||= proc do |eo|
            rows = eo[:rows]
            id_map = {}
            pkm = opts.primary_key_method

            rows.each do |object|
              if associated_pks = object.get_column_value(key)
                associated_pks.each do |apk|
                  (id_map[apk] ||= []) << object
                end
              end
            end

            eo = Hash[eo]
            eo[:id_map] = id_map
            eager_load_results(opts, eo) do |assoc_record|
              if objects = id_map[assoc_record.get_column_value(pkm)]
                objects.each do |object| 
                  object.associations[name].push(assoc_record)
                end
              end
            end
          end

          join_type = opts[:graph_join_type]
          select = opts[:graph_select]
          opts[:cartesian_product_number] ||= 1

          if opts.include?(:graph_only_conditions)
            conditions = opts[:graph_only_conditions]
            graph_block = opts[:graph_block]
          else
            conditions = opts[:graph_conditions]
            conditions = nil if conditions.empty?
            graph_block = proc do |j, lj, js|
              Sequel.pg_array_op(Sequel.deep_qualify(lj, key_column)).contains([Sequel.deep_qualify(j, opts.primary_key)])
            end

            if orig_graph_block = opts[:graph_block]
              pg_array_graph_block = graph_block
              graph_block = proc do |j, lj, js|
                Sequel.&(orig_graph_block.call(j,lj,js), pg_array_graph_block.call(j, lj, js))
              end
            end
          end

          opts[:eager_grapher] ||= proc do |eo|
            ds = eo[:self]
            ds = ds.graph(eager_graph_dataset(opts, eo), conditions, eo.merge(:select=>select, :join_type=>eo[:join_type]||join_type, :qualify=>:deep), &graph_block)
            ds
          end

          return if opts[:read_only]

          save_opts = {:validate=>opts[:validate]}
          save_opts[:raise_on_failure] = opts[:raise_on_save_failure] != false

          if opts[:save_after_modify]
            save_after_modify = proc do |obj|
              obj.save(save_opts)
            end
          end

          opts[:adder] ||= proc do |o|
            opk = o.get_column_value(opts.primary_key) 
            if array = get_column_value(key)
              modified!(key)
              array << opk
            else
              set_column_value("#{key}=", Sequel.pg_array([opk], opts.array_type))
            end
            save_after_modify.call(self) if save_after_modify
          end
  
          opts[:remover] ||= proc do |o|
            if (array = get_column_value(key)) && !array.empty?
              modified!(key)
              array.delete(o.get_column_value(opts.primary_key))
              save_after_modify.call(self) if save_after_modify
            end
          end

          opts[:clearer] ||= proc do
            if (array = get_column_value(key)) && !array.empty?
              modified!(key)
              array.clear
              save_after_modify.call(self) if save_after_modify
            end
          end
        end
      end

      module DatasetMethods
        private

        # Support filtering by many_to_pg_array associations using a subquery.
        def many_to_pg_array_association_filter_expression(op, ref, obj)
          pk = ref.qualify(model.table_name, ref.primary_key)
          key = ref[:key]
          expr = case obj
          when Sequel::Model
            if (assoc_pks = obj.get_column_value(key)) && !assoc_pks.empty?
              Sequel[pk=>assoc_pks.to_a]
            end
          when Array
            if (assoc_pks = obj.map{|o| o.get_column_value(key)}.flatten.compact.uniq) && !assoc_pks.empty?
              Sequel[pk=>assoc_pks]
            end
          when Sequel::Dataset
            obj.select(ref.qualify(obj.model.table_name, ref[:key_column]).as(:key)).from_self.where{{pk=>any(:key)}}.select(1).exists
          end
          expr = Sequel::SQL::Constants::FALSE unless expr
          expr = add_association_filter_conditions(ref, obj, expr)
          association_filter_handle_inversion(op, expr, [pk])
        end

        # Support filtering by pg_array_to_many associations using a subquery.
        def pg_array_to_many_association_filter_expression(op, ref, obj)
          key = ref.qualify(model.table_name, ref[:key_column])
          expr = case obj
          when Sequel::Model
            if pkv = obj.get_column_value(ref.primary_key_method)
              Sequel.pg_array_op(key).contains(Sequel.pg_array([pkv], ref.array_type))
            end
          when Array
            if (pkvs = obj.map{|o| o.get_column_value(ref.primary_key_method)}.compact) && !pkvs.empty?
              Sequel.pg_array(key).overlaps(Sequel.pg_array(pkvs, ref.array_type))
            end
          when Sequel::Dataset
            Sequel.function(:coalesce, Sequel.pg_array_op(key).overlaps(obj.select{array_agg(ref.qualify(obj.model.table_name, ref.primary_key))}), Sequel::SQL::Constants::FALSE)
          end
          expr = Sequel::SQL::Constants::FALSE unless expr
          expr = add_association_filter_conditions(ref, obj, expr)
          association_filter_handle_inversion(op, expr, [key])
        end
      end
    end
  end
end
