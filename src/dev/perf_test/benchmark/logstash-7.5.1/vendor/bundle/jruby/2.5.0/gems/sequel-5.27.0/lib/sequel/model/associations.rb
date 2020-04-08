# frozen-string-literal: true

module Sequel
  class Model
    # Associations are used in order to specify relationships between model classes
    # that reflect relations between tables in the database using foreign keys.
    module Associations
      # Map of association type symbols to association reflection classes.
      ASSOCIATION_TYPES = {}

      # Set an empty association reflection hash in the model
      def self.apply(model)
        model.instance_exec do
          @association_reflections = {}
          @autoreloading_associations = {}
          @cache_associations = true
          @default_eager_limit_strategy = true
          @default_association_options = {}
          @default_association_type_options = {}
          @dataset_module_class = DatasetModule
        end
      end

      # The dataset module to use for classes using the associations plugin.
      class DatasetModule < Model::DatasetModule
        def_dataset_caching_method(self, :eager)
      end

      # AssociationReflection is a Hash subclass that keeps information on Sequel::Model associations. It
      # provides methods to reduce internal code duplication.  It should not
      # be instantiated by the user.
      class AssociationReflection < Hash
        include Sequel::Inflections

        # Name symbol for the _add internal association method
        def _add_method
          self[:_add_method]
        end
      
        # Name symbol for the _remove_all internal association method
        def _remove_all_method
          self[:_remove_all_method]
        end
      
        # Name symbol for the _remove internal association method
        def _remove_method
          self[:_remove_method]
        end
      
        # Name symbol for the _setter association method
        def _setter_method
          self[:_setter_method]
        end
      
        # Name symbol for the add association method
        def add_method
          self[:add_method]
        end
      
        # Name symbol for association method, the same as the name of the association.
        def association_method
          self[:name]
        end
      
        # The class associated to the current model class via this association
        def associated_class
          cached_fetch(:class) do
            begin
              constantize(self[:class_name])
            rescue NameError => e
              raise NameError, "#{e.message} (this happened when attempting to find the associated class for #{inspect})", e.backtrace
            end
          end
        end

        # The dataset associated via this association, with the non-instance specific
        # changes already applied.  This will be a joined dataset if the association
        # requires joining tables.
        def associated_dataset
          cached_fetch(:_dataset){apply_dataset_changes(_associated_dataset)}
        end

        # Apply all non-instance specific changes to the given dataset and return it.
        def apply_dataset_changes(ds)
          ds = ds.with_extend(AssociationDatasetMethods).clone(:association_reflection => self)
          if exts = self[:reverse_extend]
            ds = ds.with_extend(*exts)
          end
          ds = ds.select(*select) if select
          if c = self[:conditions]
            ds = (c.is_a?(Array) && !Sequel.condition_specifier?(c)) ? ds.where(*c) : ds.where(c)
          end
          ds = ds.order(*self[:order]) if self[:order]
          ds = ds.limit(*self[:limit]) if self[:limit]
          ds = ds.limit(1).skip_limit_check if limit_to_single_row?
          ds = ds.eager(self[:eager]) if self[:eager]
          ds = ds.distinct if self[:distinct]
          ds
        end

        # Apply all non-instance specific changes and the eager_block option to the given
        # dataset and return it.
        def apply_eager_dataset_changes(ds)
          ds = apply_dataset_changes(ds)
          if block = self[:eager_block]
            ds = block.call(ds)
          end
          ds
        end

        # Apply the eager graph limit strategy to the dataset to graph into the current dataset, or return
        # the dataset unmodified if no SQL limit strategy is needed.
        def apply_eager_graph_limit_strategy(strategy, ds)
          case strategy
          when :distinct_on
            apply_distinct_on_eager_limit_strategy(ds.order_prepend(*self[:order]))
          when :window_function
            apply_window_function_eager_limit_strategy(ds.order_prepend(*self[:order])).select(*ds.columns)
          else
            ds
          end
        end

        # Apply an eager limit strategy to the dataset, or return the dataset
        # unmodified if it doesn't need an eager limit strategy.
        def apply_eager_limit_strategy(ds, strategy=eager_limit_strategy, limit_and_offset=limit_and_offset())
          case strategy
          when :distinct_on
            apply_distinct_on_eager_limit_strategy(ds)
          when :window_function
            apply_window_function_eager_limit_strategy(ds, limit_and_offset)
          else
            ds
          end
        end

        # Use DISTINCT ON and ORDER BY clauses to limit the results to the first record with matching keys.
        def apply_distinct_on_eager_limit_strategy(ds)
          keys = predicate_key
          ds.distinct(*keys).order_prepend(*keys)
        end

        # Use a window function to limit the results of the eager loading dataset.
        def apply_window_function_eager_limit_strategy(ds, limit_and_offset=limit_and_offset())
          rn = ds.row_number_column 
          limit, offset = limit_and_offset
          ds = ds.unordered.select_append{|o| o.row_number.function.over(:partition=>predicate_key, :order=>ds.opts[:order]).as(rn)}.from_self
          ds = ds.order(rn) if ds.db.database_type == :mysql
          ds = if !returns_array?
            ds.where(rn => offset ? offset+1 : 1)
          elsif offset
            offset += 1
            if limit
              ds.where(rn => (offset...(offset+limit))) 
            else
              ds.where{SQL::Identifier.new(rn) >= offset} 
            end
          else
            ds.where{SQL::Identifier.new(rn) <= limit} 
          end
        end

        # If the ruby eager limit strategy is being used, slice the array using the slice
        # range to return the object(s) at the correct offset/limit.
        def apply_ruby_eager_limit_strategy(rows, limit_and_offset = limit_and_offset())
          name = self[:name]
          if returns_array?
            range = slice_range(limit_and_offset)
            rows.each{|o| o.associations[name] = o.associations[name][range] || []}
          elsif sr = slice_range(limit_and_offset)
            offset = sr.begin
            rows.each{|o| o.associations[name] = o.associations[name][offset]}
          end
        end

        # Whether the associations cache should use an array when storing the
        # associated records during eager loading.
        def assign_singular?
          !returns_array?
        end

        # Whether this association can have associated objects, given the current
        # object.  Should be false if obj cannot have associated objects because
        # the necessary key columns are NULL.
        def can_have_associated_objects?(obj)
          true
        end

        # Whether you are able to clone from the given association type to the current
        # association type, true by default only if the types match.
        def cloneable?(ref)
          ref[:type] == self[:type]
        end

        # Name symbol for the dataset association method
        def dataset_method
          self[:dataset_method]
        end
      
        # Whether the dataset needs a primary key to function, true by default.
        def dataset_need_primary_key?
          true
        end
    
        # Return the symbol used for the row number column if the window function
        # eager limit strategy is being used, or nil otherwise.
        def delete_row_number_column(ds=associated_dataset)
          if eager_limit_strategy == :window_function
            ds.row_number_column 
          end
        end

        # Return an dataset that will load the appropriate associated objects for
        # the given object using this association.
        def association_dataset_for(object)
          condition = if can_have_associated_objects?(object)
            predicate_keys.zip(predicate_key_values(object))
          else
            false
          end

          associated_dataset.where(condition)
        end

        ASSOCIATION_DATASET_PROC = proc{|r| r.association_dataset_for(self)}
        # Proc used to create the association dataset method.
        def association_dataset_proc
          ASSOCIATION_DATASET_PROC
        end

        # The eager_graph limit strategy to use for this dataset
        def eager_graph_limit_strategy(strategy)
          if self[:limit] || !returns_array?
            strategy = strategy[self[:name]] if strategy.is_a?(Hash)
            case strategy
            when true
              true_eager_graph_limit_strategy
            when Symbol
              strategy
            else
              if returns_array? || offset
                :ruby
              end
            end
          end
        end
        
        # The eager limit strategy to use for this dataset.
        def eager_limit_strategy
          cached_fetch(:_eager_limit_strategy) do
            if self[:limit] || !returns_array?
              case s = cached_fetch(:eager_limit_strategy){default_eager_limit_strategy}
              when true
                true_eager_limit_strategy
              else
                s
              end
            end
          end
        end

        # Eager load the associated objects using the hash of eager options,
        # yielding each row to the block.
        def eager_load_results(eo, &block)
          rows = eo[:rows]
          initialize_association_cache(rows) unless eo[:initialize_rows] == false
          if eo[:id_map]
            ids = eo[:id_map].keys
            return ids if ids.empty?
          end
          strategy = eager_limit_strategy
          cascade = eo[:associations]
          eager_limit = nil

          if eo[:eager_block] || eo[:loader] == false
            ds = eager_loading_dataset(eo)

            strategy = ds.opts[:eager_limit_strategy] || strategy

            eager_limit =
              if el = ds.opts[:eager_limit]
                raise Error, "The :eager_limit dataset option is not supported for associations returning a single record" unless returns_array?
                strategy ||= true_eager_graph_limit_strategy
                if el.is_a?(Array)
                  el
                else
                  [el, nil]
                end
              else
                limit_and_offset
              end

            strategy = true_eager_graph_limit_strategy if strategy == :union
            # Correlated subqueries are not supported for regular eager loading
            strategy = :ruby if strategy == :correlated_subquery
            strategy = nil if strategy == :ruby && assign_singular?
            objects = apply_eager_limit_strategy(ds, strategy, eager_limit).all
          elsif strategy == :union
            objects = []
            ds = associated_dataset
            loader = union_eager_loader
            joiner = " UNION ALL "
            ids.each_slice(subqueries_per_union).each do |slice|
              objects.concat(ds.with_sql(slice.map{|k| loader.sql(*k)}.join(joiner)).to_a)
            end
            ds = ds.eager(cascade) if cascade
            ds.send(:post_load, objects)
          else
            loader = placeholder_eager_loader
            loader = loader.with_dataset{|dataset| dataset.eager(cascade)} if cascade
            objects = loader.all(ids)
          end

          objects.each(&block)
          if strategy == :ruby
            apply_ruby_eager_limit_strategy(rows, eager_limit || limit_and_offset)
          end
        end

        # The key to use for the key hash when eager loading
        def eager_loader_key
          self[:eager_loader_key]
        end
    
        # By default associations do not need to select a key in an associated table
        # to eagerly load.
        def eager_loading_use_associated_key?
          false
        end

        # Whether to eagerly graph a lazy dataset, true by default.  If this
        # is false, the association won't respect the :eager_graph option
        # when loading the association for a single record.
        def eager_graph_lazy_dataset?
          true
        end
    
        # Whether additional conditions should be added when using the filter
        # by associations support.
        def filter_by_associations_add_conditions?
          self[:conditions] || self[:eager_block] || self[:limit]
        end

        # The expression to use for the additional conditions to be added for
        # the filter by association support, when the association itself is
        # filtered.  Works by using a subquery to test that the objects passed
        # also meet the association filter criteria.
        def filter_by_associations_conditions_expression(obj)
          ds = filter_by_associations_conditions_dataset.where(filter_by_associations_conditions_subquery_conditions(obj))
          {filter_by_associations_conditions_key=>ds}
        end

        # Finalize the association by first attempting to populate the thread-safe cache,
        # and then transfering the thread-safe cache value to the association itself,
        # so that a mutex is not needed to get the value.
        def finalize
          return unless cache = self[:cache]

          finalize_settings.each do |meth, key|
            next if has_key?(key)

            # Allow calling private methods to make sure caching is done appropriately
            send(meth)
            self[key] = cache.delete(key) if cache.has_key?(key)
          end

          nil
        end

        # Map of methods to cache keys used for finalizing associations.
        FINALIZE_SETTINGS = {
          :associated_class=>:class,
          :associated_dataset=>:_dataset,
          :associated_eager_dataset=>:associated_eager_dataset,
          :eager_limit_strategy=>:_eager_limit_strategy,
          :filter_by_associations_conditions_dataset=>:filter_by_associations_conditions_dataset,
          :placeholder_loader=>:placeholder_loader,
          :predicate_key=>:predicate_key,
          :predicate_keys=>:predicate_keys,
          :reciprocal=>:reciprocal,
        }.freeze
        def finalize_settings
          FINALIZE_SETTINGS
        end
    
        # Whether to handle silent modification failure when adding/removing
        # associated records, false by default.
        def handle_silent_modification_failure?
          false
        end

        # Initialize the associations cache for the current association for the given objects.
        def initialize_association_cache(objects)
          name = self[:name]
          if assign_singular?
            objects.each{|object| object.associations[name] = nil}
          else
            objects.each{|object| object.associations[name] = []}
          end
        end

        # Show which type of reflection this is, and a guess at what code was used to create the
        # association.
        def inspect
          o = self[:orig_opts].dup
          o.delete(:class)
          o.delete(:class_name)
          o.delete(:block) unless o[:block]
          o[:class] = self[:orig_class] if self[:orig_class]

          "#<#{self.class} #{self[:model]}.#{self[:type]} #{self[:name].inspect}#{", #{o.inspect[1...-1]}" unless o.empty?}>"
        end

        # The limit and offset for this association (returned as a two element array).
        def limit_and_offset
          if (v = self[:limit]).is_a?(Array)
            v
          else
            [v, nil]
          end
        end

        # Whether the associated object needs a primary key to be added/removed,
        # false by default.
        def need_associated_primary_key?
          false
        end

        # A placeholder literalizer that can be used to lazily load the association. If
        # one can't be used, returns nil.
        def placeholder_loader
          if use_placeholder_loader?
            cached_fetch(:placeholder_loader) do
              Sequel::Dataset::PlaceholderLiteralizer.loader(associated_dataset) do |pl, ds|
                ds.where(Sequel.&(*predicate_keys.map{|k| SQL::BooleanExpression.new(:'=', k, pl.arg)}))
              end
            end
          end
        end

        # The keys to use for loading of the regular dataset, as an array.
        def predicate_keys
          cached_fetch(:predicate_keys){Array(predicate_key)}
        end

        # The values that predicate_keys should match for objects to be associated.
        def predicate_key_values(object)
          predicate_key_methods.map{|k| object.get_column_value(k)}
        end

        # Qualify +col+ with the given table name.
        def qualify(table, col)
          transform(col) do |k|
            case k
            when Symbol, SQL::Identifier
              SQL::QualifiedIdentifier.new(table, k)
            else
              Sequel::Qualifier.new(table).transform(k)
            end
          end
        end

        # Qualify col with the associated model's table name.
        def qualify_assoc(col)
          qualify(associated_class.table_name, col)
        end
        
        # Qualify col with the current model's table name.
        def qualify_cur(col)
          qualify(self[:model].table_name, col)
        end
        
        # Returns the reciprocal association variable, if one exists. The reciprocal
        # association is the association in the associated class that is the opposite
        # of the current association.  For example, Album.many_to_one :artist and
        # Artist.one_to_many :albums are reciprocal associations.  This information is
        # to populate reciprocal associations.  For example, when you do this_artist.add_album(album)
        # it sets album.artist to this_artist.
        def reciprocal
          cached_fetch(:reciprocal) do
            possible_recips = []

            associated_class.all_association_reflections.each do |assoc_reflect|
              if reciprocal_association?(assoc_reflect)
                possible_recips << assoc_reflect
              end
            end

            if possible_recips.length == 1
              cached_set(:reciprocal_type, possible_recips.first[:type]) if ambiguous_reciprocal_type?
              possible_recips.first[:name]
            end
          end
        end

        # Whether the reciprocal of this association returns an array of objects instead of a single object,
        # true by default.
        def reciprocal_array?
          true
        end
    
        # Name symbol for the remove_all_ association method
        def remove_all_method
          self[:remove_all_method]
        end
      
        # Whether associated objects need to be removed from the association before
        # being destroyed in order to preserve referential integrity.
        def remove_before_destroy?
          true
        end
    
        # Name symbol for the remove_ association method
        def remove_method
          self[:remove_method]
        end
      
        # Whether to check that an object to be disassociated is already associated to this object, false by default.
        def remove_should_check_existing?
          false
        end

        # Whether this association returns an array of objects instead of a single object,
        # true by default.
        def returns_array?
          true
        end
    
        # The columns to select when loading the association.
        def select
          self[:select]
        end
    
        # Whether to set the reciprocal association to self when loading associated
        # records, false by default.
        def set_reciprocal_to_self?
          false
        end
    
        # Name symbol for the setter association method
        def setter_method
          self[:setter_method]
        end
        
        # The range used for slicing when using the :ruby eager limit strategy.
        def slice_range(limit_and_offset = limit_and_offset())
          limit, offset = limit_and_offset
          if limit || offset
            (offset||0)..(limit ? (offset||0)+limit-1 : -1)
          end
        end
        
        private

        # If the key exists in the reflection hash, return it.
        # If the key doesn't exist and association reflections are uncached, then yield to get the value.
        # If the key doesn't exist and association reflection are cached, check the cache and return
        # the value if present, or yield to get the value, cache the value, and return it.
        def cached_fetch(key)
          fetch(key) do
            return yield unless h = self[:cache]
            Sequel.synchronize{return h[key] if h.has_key?(key)}
            value = yield
            Sequel.synchronize{h[key] = value}
          end
        end

        # Cache the value at the given key if caching.
        def cached_set(key, value)
          return unless h = self[:cache]
          Sequel.synchronize{h[key] = value}
        end

        # The base dataset used for the association, before any order/conditions
        # options have been applied.
        def _associated_dataset
          associated_class.dataset
        end

        # Whether for the reciprocal type for the given association cannot be
        # known in advantage, false by default.
        def ambiguous_reciprocal_type?
          false
        end

        # Apply a limit strategy to the given dataset so that filter by
        # associations works with a limited dataset.
        def apply_filter_by_associations_limit_strategy(ds)
          case filter_by_associations_limit_strategy
          when :distinct_on
            apply_filter_by_associations_distinct_on_limit_strategy(ds)
          when :window_function
            apply_filter_by_associations_window_function_limit_strategy(ds)
          else
            ds
          end
        end

        # Apply a distinct on eager limit strategy using IN with a subquery
        # that uses DISTINCT ON to ensure only the first matching record for
        # each key is included.
        def apply_filter_by_associations_distinct_on_limit_strategy(ds)
          k = filter_by_associations_limit_key 
          ds.where(k=>apply_distinct_on_eager_limit_strategy(associated_eager_dataset.select(*k)))
        end

        # Apply a distinct on eager limit strategy using IN with a subquery
        # that uses a filter on the row_number window function to ensure
        # that only rows inside the limit are returned.
        def apply_filter_by_associations_window_function_limit_strategy(ds)
          ds.where(filter_by_associations_limit_key=>apply_window_function_eager_limit_strategy(associated_eager_dataset.select(*filter_by_associations_limit_alias_key)).select(*filter_by_associations_limit_aliases))
        end

        # The associated_dataset with the eager_block callback already applied.
        def associated_eager_dataset
          cached_fetch(:associated_eager_dataset) do
            ds = associated_dataset.unlimited
            if block = self[:eager_block]
              ds = block.call(ds)
            end
            ds
          end
        end

        # The dataset to use for eager loading associated objects for multiple current objects,
        # given the hash passed to the eager loader.
        def eager_loading_dataset(eo=OPTS)
          ds = eo[:dataset] || associated_eager_dataset
          if id_map = eo[:id_map]
            ds = ds.where(eager_loading_predicate_condition(id_map.keys))
          end
          if associations = eo[:associations]
            ds = ds.eager(associations)
          end
          if block = eo[:eager_block]
            orig_ds = ds
            ds = block.call(ds)
          end
          if eager_loading_use_associated_key?
            ds = if ds.opts[:eager_graph] && !orig_ds.opts[:eager_graph]
              block.call(orig_ds.select_append(*associated_key_array))
            else
              ds.select_append(*associated_key_array)
            end
          end
          if self[:eager_graph]
            raise(Error, "cannot eagerly load a #{self[:type]} association that uses :eager_graph") if eager_loading_use_associated_key?
            ds = ds.eager_graph(self[:eager_graph])
          end
          ds
        end

        # The default eager limit strategy to use for this association
        def default_eager_limit_strategy
          self[:model].default_eager_limit_strategy || :ruby
        end

        # The predicate condition to use for the eager_loader.
        def eager_loading_predicate_condition(keys)
          {predicate_key=>keys}
        end

        # Add conditions to the dataset to not include NULL values for
        # the associated keys, and select those keys.
        def filter_by_associations_add_conditions_dataset_filter(ds)
          k = filter_by_associations_conditions_associated_keys
          ds.select(*k).where(Sequel.negate(k.zip([])))
        end

        # The conditions to add to the filter by associations conditions
        # subquery to restrict it to to the object(s) that was used as the
        # filter value.
        def filter_by_associations_conditions_subquery_conditions(obj)
          key = qualify(associated_class.table_name, associated_class.primary_key)
          case obj
          when Array
            {key=>obj.map(&:pk)}
          when Sequel::Dataset
            {key=>obj.select(*Array(qualify(associated_class.table_name, associated_class.primary_key)))}
          else
            Array(key).zip(Array(obj.pk))
          end
        end

        # The base dataset to use for the filter by associations conditions
        # subquery, regardless of the objects that are passed in as filter
        # values.
        def filter_by_associations_conditions_dataset
          cached_fetch(:filter_by_associations_conditions_dataset) do
            ds = associated_eager_dataset.unordered
            ds = filter_by_associations_add_conditions_dataset_filter(ds)
            ds = apply_filter_by_associations_limit_strategy(ds)
            ds
          end
        end

        # The strategy to use to filter by a limited association
        def filter_by_associations_limit_strategy
          v = fetch(:filter_limit_strategy, self[:eager_limit_strategy])
          if v || self[:limit] || !returns_array?
            case v ||= self[:model].default_eager_limit_strategy
            when true, :union, :ruby
              # Can't use a union or ruby-based strategy for filtering by associations, switch to default eager graph limit
              # strategy.
              true_eager_graph_limit_strategy
            when Symbol
              v
            end
          end
        end

        # Whether to limit the associated dataset to a single row.
        def limit_to_single_row?
          !returns_array?
        end
        
        # Any offset to use for this association (or nil if there is no offset).
        def offset
          limit_and_offset.last
        end

        # A placeholder literalizer used to speed up eager loading.
        def placeholder_eager_loader
          cached_fetch(:placeholder_eager_loader) do
            Sequel::Dataset::PlaceholderLiteralizer.loader(associated_dataset) do |pl, ds|
              apply_eager_limit_strategy(eager_loading_dataset.where(predicate_key=>pl.arg), eager_limit_strategy)
            end
          end
        end

        # The reciprocal type as an array, should be overridden in reflection subclasses that
        # have ambiguous reciprocal types.
        def possible_reciprocal_types
          [reciprocal_type]
        end

        # Whether the given association reflection is possible reciprocal
        # association for the current association reflection.
        def reciprocal_association?(assoc_reflect)
          possible_reciprocal_types.include?(assoc_reflect[:type]) &&
            (begin; assoc_reflect.associated_class; rescue NameError; end) == self[:model] &&
            assoc_reflect[:conditions].nil? &&
            assoc_reflect[:block].nil?
        end
    
        # The number of subqueries to use in each union query, used to eagerly load
        # limited associations.  Defaults to 40, the optimal number depends on the
        # latency between the database and the application.
        def subqueries_per_union
          self[:subqueries_per_union] || 40
        end

        # If +s+ is an array, map +s+ over the block.  Otherwise, just call the
        # block with +s+.
        def transform(s, &block)
          s.is_a?(Array) ? s.map(&block) : (yield s)
        end

        # What eager limit strategy should be used when true is given as the value,
        # defaults to UNION as that is the fastest strategy if the appropriate keys are indexed.
        def true_eager_limit_strategy
          if self[:eager_graph] || (offset && !associated_dataset.supports_offsets_in_correlated_subqueries?)
            # An SQL-based approach won't work if you are also eager graphing,
            # so use a ruby based approach in that case.
            :ruby
          else
            :union 
          end
        end

        # The eager_graph limit strategy used when true is given as the value, choosing the
        # best strategy based on what the database supports.
        def true_eager_graph_limit_strategy
          if associated_class.dataset.supports_window_functions?
            :window_function
          else
            :ruby
          end
        end

        # A placeholder literalizer used to speed up the creation of union queries when eager
        # loading a limited association.
        def union_eager_loader
          cached_fetch(:union_eager_loader) do
            Sequel::Dataset::PlaceholderLiteralizer.loader(associated_dataset) do |pl, ds|
              ds = self[:eager_block].call(ds) if self[:eager_block]
              keys = predicate_keys
              ds = ds.where(keys.map{pl.arg}.zip(keys))
              if eager_loading_use_associated_key?
                ds = ds.select_append(*associated_key_array)
              end
              ds.from_self
            end
          end
        end

        # Whether the placeholder loader can be used to load the association.
        def use_placeholder_loader?
          !self[:instance_specific] && !self[:eager_graph]
        end
      end
    
      class ManyToOneAssociationReflection < AssociationReflection
        ASSOCIATION_TYPES[:many_to_one] = self
    
        # many_to_one associations can only have associated objects if none of
        # the :keys options have a nil value.
        def can_have_associated_objects?(obj)
          !self[:keys].any?{|k| obj.get_column_value(k).nil?}
        end
        
        # Whether the dataset needs a primary key to function, false for many_to_one associations.
        def dataset_need_primary_key?
          false
        end
    
        # Default foreign key name symbol for foreign key in current model's table that points to
        # the given association's table's primary key.
        def default_key
          :"#{self[:name]}_id"
        end
      
        # Whether to eagerly graph a lazy dataset, true for many_to_one associations
        # only if the key is nil.
        def eager_graph_lazy_dataset?
          self[:key].nil?
        end
    
        # many_to_one associations don't need an eager_graph limit strategy
        def eager_graph_limit_strategy(_)
          nil
        end

        # many_to_one associations don't need an eager limit strategy
        def eager_limit_strategy
          nil
        end

        # many_to_one associations don't need a filter by associations limit strategy
        def filter_by_associations_limit_strategy
          nil
        end

        FINALIZE_SETTINGS = superclass::FINALIZE_SETTINGS.merge(
          :primary_key=>:primary_key,
          :primary_keys=>:primary_keys,
          :primary_key_method=>:primary_key_method,
          :primary_key_methods=>:primary_key_methods,
          :qualified_primary_key=>:qualified_primary_key,
          :reciprocal_type=>:reciprocal_type
        ).freeze
        def finalize_settings
          FINALIZE_SETTINGS
        end

        # The expression to use on the left hand side of the IN lookup when eager loading
        def predicate_key
          cached_fetch(:predicate_key){qualified_primary_key}
        end

        # The column(s) in the associated table that the key in the current table references (either a symbol or an array).
        def primary_key
         cached_fetch(:primary_key){associated_class.primary_key || raise(Error, "no primary key specified for #{associated_class.inspect}")}
        end
       
        # The columns in the associated table that the key in the current table references (always an array).
        def primary_keys
         cached_fetch(:primary_keys){Array(primary_key)}
        end
        alias associated_object_keys primary_keys

        # The method symbol or array of method symbols to call on the associated object
        # to get the value to use for the foreign keys.
        def primary_key_method
         cached_fetch(:primary_key_method){primary_key}
        end
       
        # The array of method symbols to call on the associated object
        # to get the value to use for the foreign keys.
        def primary_key_methods
         cached_fetch(:primary_key_methods){Array(primary_key_method)}
        end
       
        # #primary_key qualified by the associated table
        def qualified_primary_key
          cached_fetch(:qualified_primary_key){self[:qualify] == false ? primary_key : qualify_assoc(primary_key)}
        end
        
        # True only if the reciprocal is a one_to_many association.
        def reciprocal_array?
          !set_reciprocal_to_self?
        end
      
        # Whether this association returns an array of objects instead of a single object,
        # false for a many_to_one association.
        def returns_array?
          false
        end
        
        # True only if the reciprocal is a one_to_one association.
        def set_reciprocal_to_self?
          reciprocal
          reciprocal_type == :one_to_one
        end
    
        private
    
        # Reciprocals of many_to_one associations could be either one_to_many or one_to_one,
        # and which is not known in advance.
        def ambiguous_reciprocal_type?
          true
        end

        def filter_by_associations_conditions_associated_keys
          qualify(associated_class.table_name, primary_keys)
        end

        def filter_by_associations_conditions_key
          qualify(self[:model].table_name, self[:key_column])
        end

        # many_to_one associations do not need to be limited to a single row if they
        # explicitly do not have a key.
        def limit_to_single_row?
          super && self[:key]
        end
        
        def predicate_key_methods
          self[:keys]
        end
    
        # The reciprocal type of a many_to_one association is either
        # a one_to_many or a one_to_one association.
        def possible_reciprocal_types
          [:one_to_many, :one_to_one]
        end

        # Whether the given association reflection is possible reciprocal
        def reciprocal_association?(assoc_reflect)
          super && self[:keys] == assoc_reflect[:keys] && primary_key == assoc_reflect.primary_key
        end

        # The reciprocal type of a many_to_one association is either
        # a one_to_many or a one_to_one association, look in the associated class
        # to try to figure out which.
        def reciprocal_type
          cached_fetch(:reciprocal_type) do
            possible_recips = []

            associated_class.all_association_reflections.each do |assoc_reflect|
              if reciprocal_association?(assoc_reflect)
                possible_recips << assoc_reflect
              end
            end

            if possible_recips.length == 1
              possible_recips.first[:type]
            else
              possible_reciprocal_types
            end
          end
        end
      end
    
      class OneToManyAssociationReflection < AssociationReflection
        ASSOCIATION_TYPES[:one_to_many] = self
        
        # Support a correlated subquery limit strategy when using eager_graph.
        def apply_eager_graph_limit_strategy(strategy, ds)
          case strategy
          when :correlated_subquery
            apply_correlated_subquery_limit_strategy(ds)
          else
            super
          end
        end

        # The keys in the associated model's table related to this association
        def associated_object_keys
          self[:keys]
        end

        # one_to_many associations can only have associated objects if none of
        # the :keys options have a nil value.
        def can_have_associated_objects?(obj)
          !self[:primary_keys].any?{|k| obj.get_column_value(k).nil?}
        end

        # one_to_many and one_to_one associations can be clones
        def cloneable?(ref)
          ref[:type] == :one_to_many || ref[:type] == :one_to_one
        end

        # Default foreign key name symbol for key in associated table that points to
        # current table's primary key.
        def default_key
          :"#{underscore(demodulize(self[:model].name))}_id"
        end

        FINALIZE_SETTINGS = superclass::FINALIZE_SETTINGS.merge(
          :qualified_primary_key=>:qualified_primary_key
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
          cached_fetch(:predicate_key){qualify_assoc(self[:key])}
        end
        alias qualified_key predicate_key

        # The column in the current table that the key in the associated table references.
        def primary_key
          self[:primary_key]
        end

        # #primary_key qualified by the current table
        def qualified_primary_key
          cached_fetch(:qualified_primary_key){qualify_cur(primary_key)}
        end
      
        # Whether the reciprocal of this association returns an array of objects instead of a single object,
        # false for a one_to_many association.
        def reciprocal_array?
          false
        end
    
        # Destroying one_to_many associated objects automatically deletes the foreign key.
        def remove_before_destroy?
          false
        end
    
        # The one_to_many association needs to check that an object to be removed already is associated.
        def remove_should_check_existing?
          true
        end

        # One to many associations set the reciprocal to self when loading associated records.
        def set_reciprocal_to_self?
          true
        end
    
        private
    
        # Use a correlated subquery to limit the dataset.  Note that this will not
        # work correctly if the associated dataset uses qualified identifers in the WHERE clause,
        # as they would reference the containing query instead of the subquery.
        def apply_correlated_subquery_limit_strategy(ds)
          table = ds.first_source_table
          table_alias = ds.first_source_alias
          primary_key = associated_class.primary_key
          key = self[:key]
          cs_alias = :t1
          cs = associated_dataset.
            from(Sequel.as(table, :t1)).
            select(*qualify(cs_alias, primary_key)).
            where(Array(qualify(cs_alias, key)).zip(Array(qualify(table_alias, key)))).
            limit(*limit_and_offset)
          ds.where(qualify(table_alias, primary_key)=>cs)
        end

        # Support correlated subquery strategy when filtering by limited associations.
        def apply_filter_by_associations_limit_strategy(ds)
          case filter_by_associations_limit_strategy
          when :correlated_subquery
            apply_correlated_subquery_limit_strategy(ds)
          else
            super
          end
        end

        def filter_by_associations_conditions_associated_keys
          qualify(associated_class.table_name, self[:keys])
        end

        def filter_by_associations_conditions_key
          qualify(self[:model].table_name, self[:primary_key_column])
        end

        def filter_by_associations_limit_alias_key
          Array(filter_by_associations_limit_key)
        end

        def filter_by_associations_limit_aliases
          filter_by_associations_limit_alias_key.map(&:column)
        end

        def filter_by_associations_limit_key
          qualify(associated_class.table_name, associated_class.primary_key)
        end

        def predicate_key_methods
          self[:primary_keys]
        end
    
        def reciprocal_association?(assoc_reflect)
          super && self[:keys] == assoc_reflect[:keys] && primary_key == assoc_reflect.primary_key
        end

        # The reciprocal type of a one_to_many association is a many_to_one association.
        def reciprocal_type
          :many_to_one
        end

        # Support automatic use of correlated subqueries if :ruby option is best available option,
        # the database supports them, and either the associated class has a non-composite primary key
        # or the database supports multiple columns in IN.
        def true_eager_graph_limit_strategy
          r = super
          ds = associated_dataset
          if r == :ruby && ds.supports_limits_in_correlated_subqueries? && (Array(associated_class.primary_key).length == 1 || ds.supports_multiple_column_in?) && (!offset || ds.supports_offsets_in_correlated_subqueries?)
            :correlated_subquery
          else
            r
          end
        end
      end

      # Methods that turn an association that returns multiple objects into an association that
      # returns a single object.
      module SingularAssociationReflection
        # Singular associations do not assign singular if they are using the ruby eager limit strategy
        # and have a slice range, since they need to store the array of associated objects in order to
        # pick the correct one with an offset.
        def assign_singular?
          super && (eager_limit_strategy != :ruby || !slice_range)
        end

        # Add conditions when filtering by singular associations with orders, since the
        # underlying relationship is probably not one-to-one.
        def filter_by_associations_add_conditions?
          super || self[:order] || self[:eager_limit_strategy] || self[:filter_limit_strategy]
        end

        # Make sure singular associations always have 1 as the limit
        def limit_and_offset
          r = super
          if r.first == 1
            r
          else
            [1, r[1]]
          end
        end

        # Singular associations always return a single object, not an array.
        def returns_array?
          false
        end

        private

        # Only use a eager limit strategy by default if there is an offset or an order.
        def default_eager_limit_strategy
          super if self[:order] || offset
        end

        # Use a strategy for filtering by associations if there is an order or an offset,
        # or a specific limiting strategy has been specified.
        def filter_by_associations_limit_strategy
          super if self[:order] || offset || self[:eager_limit_strategy] || self[:filter_limit_strategy]
        end

        # Use the DISTINCT ON eager limit strategy for true if the database supports it.
        def true_eager_graph_limit_strategy
          if associated_class.dataset.supports_ordered_distinct_on? && !offset
            :distinct_on
          else
            super
          end
        end
      end
      
      class OneToOneAssociationReflection < OneToManyAssociationReflection
        ASSOCIATION_TYPES[:one_to_one] = self
        include SingularAssociationReflection
      end
    
      class ManyToManyAssociationReflection < AssociationReflection
        ASSOCIATION_TYPES[:many_to_many] = self
    
        # The alias to use for the associated key when eagerly loading
        def associated_key_alias
          self[:left_key_alias]
        end

        # Array of associated keys used when eagerly loading.
        def associated_key_array
          cached_fetch(:associated_key_array) do
            if self[:uses_left_composite_keys]
              associated_key_alias.zip(predicate_keys).map{|a, k| SQL::AliasedExpression.new(k, a)}
            else
              [SQL::AliasedExpression.new(predicate_key, associated_key_alias)]
            end
          end
        end

        # The column to use for the associated key when eagerly loading
        def associated_key_column
          self[:left_key]
        end

        # Alias of right_primary_keys
        def associated_object_keys
          right_primary_keys
        end

        # many_to_many associations can only have associated objects if none of
        # the :left_primary_keys options have a nil value.
        def can_have_associated_objects?(obj)
          !self[:left_primary_keys].any?{|k| obj.get_column_value(k).nil?}
        end

        # one_through_one and many_to_many associations can be clones
        def cloneable?(ref)
          ref[:type] == :many_to_many || ref[:type] == :one_through_one
        end

        # The default associated key alias(es) to use when eager loading
        # associations via eager.
        def default_associated_key_alias
          self[:uses_left_composite_keys] ? (0...self[:left_keys].length).map{|i| :"x_foreign_key_#{i}_x"} : :x_foreign_key_x
        end
      
        # The default eager loader used if the user doesn't override it.  Extracted
        # to a method so the code can be shared with the many_through_many plugin.
        def default_eager_loader(eo)
          h = eo[:id_map]
          assign_singular = assign_singular?
          delete_rn = delete_row_number_column
          uses_lcks = self[:uses_left_composite_keys]
          left_key_alias = self[:left_key_alias]
          name = self[:name]

          self[:model].eager_load_results(self, eo) do |assoc_record|
            assoc_record.values.delete(delete_rn) if delete_rn
            hash_key = if uses_lcks
              left_key_alias.map{|k| assoc_record.values.delete(k)}
            else
              assoc_record.values.delete(left_key_alias)
            end
            next unless objects = h[hash_key]
            if assign_singular
              objects.each do |object| 
                object.associations[name] ||= assoc_record
              end
            else
              objects.each do |object|
                object.associations[name].push(assoc_record)
              end
            end
          end
        end

        # Default name symbol for the join table.
        def default_join_table
          [self[:class_name], self[:model].name].map{|i| underscore(pluralize(demodulize(i)))}.sort.join('_').to_sym
        end

        # Default foreign key name symbol for key in join table that points to
        # current table's primary key (or :left_primary_key column).
        def default_left_key
          :"#{underscore(demodulize(self[:model].name))}_id"
        end
    
        # Default foreign key name symbol for foreign key in join table that points to
        # the association's table's primary key (or :right_primary_key column).
        def default_right_key
          :"#{singularize(self[:name])}_id"
        end
      
        FINALIZE_SETTINGS = superclass::FINALIZE_SETTINGS.merge(
          :associated_key_array=>:associated_key_array,
          :qualified_right_key=>:qualified_right_key,
          :join_table_source=>:join_table_source,
          :join_table_alias=>:join_table_alias,
          :qualified_right_primary_key=>:qualified_right_primary_key,
          :right_primary_key=>:right_primary_key,
          :right_primary_keys=>:right_primary_keys,
          :right_primary_key_method=>:right_primary_key_method,
          :right_primary_key_methods=>:right_primary_key_methods,
          :select=>:select
        ).freeze
        def finalize_settings
          FINALIZE_SETTINGS
        end

        # The hash key to use for the eager loading predicate (left side of IN (1, 2, 3)).
        # The left key qualified by the join table.
        def predicate_key
          cached_fetch(:predicate_key){qualify(join_table_alias, self[:left_key])}
        end
        alias qualified_left_key predicate_key

        # The right key qualified by the join table.
        def qualified_right_key
          cached_fetch(:qualified_right_key){qualify(join_table_alias, self[:right_key])}
        end
    
        # many_to_many associations need to select a key in an associated table to eagerly load
        def eager_loading_use_associated_key?
          true
        end

        # The source of the join table.  This is the join table itself, unless it
        # is aliased, in which case it is the unaliased part.
        def join_table_source
          cached_fetch(:join_table_source){split_join_table_alias[0]}
        end

        # The join table itself, unless it is aliased, in which case this
        # is the alias.
        def join_table_alias
          cached_fetch(:join_table_alias) do
            s, a = split_join_table_alias
            a || s
          end
        end
        alias associated_key_table join_table_alias
        
        # Whether the associated object needs a primary key to be added/removed,
        # true for many_to_many associations.
        def need_associated_primary_key?
          true
        end
    
        # #right_primary_key qualified by the associated table
        def qualified_right_primary_key
          cached_fetch(:qualified_right_primary_key){qualify_assoc(right_primary_key)}
        end
    
        # The primary key column(s) to use in the associated table (can be symbol or array).
        def right_primary_key
          cached_fetch(:right_primary_key){associated_class.primary_key || raise(Error, "no primary key specified for #{associated_class.inspect}")}
        end
        
        # The primary key columns to use in the associated table (always array).
        def right_primary_keys
          cached_fetch(:right_primary_keys){Array(right_primary_key)}
        end
    
        # The method symbol or array of method symbols to call on the associated objects
        # to get the foreign key values for the join table. 
        def right_primary_key_method
          cached_fetch(:right_primary_key_method){right_primary_key}
        end

        # The array of method symbols to call on the associated objects
        # to get the foreign key values for the join table. 
        def right_primary_key_methods
          cached_fetch(:right_primary_key_methods){Array(right_primary_key_method)}
        end
        
        # The columns to select when loading the association, associated_class.table_name.* by default.
        def select
          cached_fetch(:select){default_select}
        end

        private

        def _associated_dataset
          super.inner_join(self[:join_table], self[:right_keys].zip(right_primary_keys), :qualify=>:deep)
        end

        # The default selection for associations that require joins.  These do not use the default
        # model selection unless all entries in the select are explicitly qualified identifiers, as
        # other it can include unqualified columns which would be made ambiguous by joining.
        def default_select
          if (sel = associated_class.dataset.opts[:select]) && sel.all?{|c| selection_is_qualified?(c)}
            sel
          else
            Sequel::SQL::ColumnAll.new(associated_class.table_name)
          end
        end

        def filter_by_associations_conditions_associated_keys
          qualify(join_table_alias, self[:left_keys])
        end

        def filter_by_associations_conditions_key
          qualify(self[:model].table_name, self[:left_primary_key_column])
        end

        def filter_by_associations_limit_alias_key
          aliaz = 'a'
          filter_by_associations_limit_key.map{|c| c.as(Sequel.identifier(aliaz = aliaz.next))}
        end

        def filter_by_associations_limit_aliases
          filter_by_associations_limit_alias_key.map(&:alias)
        end

        def filter_by_associations_limit_key
          qualify(join_table_alias, self[:left_keys]) + Array(qualify(associated_class.table_name, associated_class.primary_key))
        end

        def predicate_key_methods
          self[:left_primary_keys]
        end
    
        def reciprocal_association?(assoc_reflect)
          super && assoc_reflect[:left_keys] == self[:right_keys] &&
            assoc_reflect[:right_keys] == self[:left_keys] &&
            assoc_reflect[:join_table] == self[:join_table] &&
            right_primary_keys == assoc_reflect[:left_primary_key_columns] &&
            self[:left_primary_key_columns] == assoc_reflect.right_primary_keys
        end

        def reciprocal_type
          :many_to_many
        end

        # Whether the given expression represents a qualified identifier.  Used to determine if it is
        # OK to use directly when joining.
        def selection_is_qualified?(c)
          case c
          when Symbol
            Sequel.split_symbol(c)[0]
          when Sequel::SQL::QualifiedIdentifier
            true
          when Sequel::SQL::AliasedExpression
            selection_is_qualified?(c.expression)
          else
            false
          end
        end

        # Split the join table into source and alias parts.
        def split_join_table_alias
          associated_class.dataset.split_alias(self[:join_table])
        end
      end
  
      class OneThroughOneAssociationReflection < ManyToManyAssociationReflection
        ASSOCIATION_TYPES[:one_through_one] = self
        include SingularAssociationReflection
        
        # one_through_one associations should not singularize the association name when
        # creating the foreign key.
        def default_right_key
          :"#{self[:name]}_id"
        end
      
        # one_through_one associations have no reciprocals
        def reciprocal
          nil
        end
      end
    
      # This module contains methods added to all association datasets
      module AssociationDatasetMethods
        # The model object that created the association dataset
        def model_object
          @opts[:model_object]
        end
    
        # The association reflection related to the association dataset
        def association_reflection
          @opts[:association_reflection]
        end
        
        private

        def non_sql_option?(key)
          super || key == :model_object || key == :association_reflection
        end
      end
      
      # Each kind of association adds a number of instance methods to the model class which
      # are specialized according to the association type and optional parameters
      # given in the definition. Example:
      # 
      #   class Project < Sequel::Model
      #     many_to_one :portfolio
      #     # or: one_to_one :portfolio
      #     one_to_many :milestones
      #     # or: many_to_many :milestones 
      #   end
      # 
      # The project class now has the following instance methods:
      # portfolio :: Returns the associated portfolio.
      # portfolio=(obj) :: Sets the associated portfolio to the object,
      #                    but the change is not persisted until you save the record (for many_to_one associations).
      # portfolio_dataset :: Returns a dataset that would return the associated
      #                      portfolio, only useful in fairly specific circumstances.
      # milestones :: Returns an array of associated milestones
      # add_milestone(obj) :: Associates the passed milestone with this object.
      # remove_milestone(obj) :: Removes the association with the passed milestone.
      # remove_all_milestones :: Removes associations with all associated milestones.
      # milestones_dataset :: Returns a dataset that would return the associated
      #                       milestones, allowing for further filtering/limiting/etc.
      #
      # If you want to override the behavior of the add_/remove_/remove_all_/ methods
      # or the association setter method, use the :adder, :remover, :clearer, and/or :setter
      # options.  These options override the default behavior.
      #
      # By default the classes for the associations are inferred from the association
      # name, so for example the Project#portfolio will return an instance of 
      # Portfolio, and Project#milestones will return an array of Milestone 
      # instances.  You can use the :class option to change which class is used.
      #
      # Association definitions are also reflected by the class, e.g.:
      #
      #   Project.associations
      #   => [:portfolio, :milestones]
      #   Project.association_reflection(:portfolio)
      #   => #<Sequel::Model::Associations::ManyToOneAssociationReflection Project.many_to_one :portfolio>
      #
      # Associations should not have the same names as any of the columns in the
      # model's current table they reference. If you are dealing with an existing schema that
      # has a column named status, you can't name the association status, you'd
      # have to name it foo_status or something else.  If you give an association the same name
      # as a column, you will probably end up with an association that doesn't work, or a SystemStackError.
      #
      # For a more in depth general overview, as well as a reference guide,
      # see the {Association Basics guide}[rdoc-ref:doc/association_basics.rdoc].
      # For examples of advanced usage, see the {Advanced Associations guide}[rdoc-ref:doc/advanced_associations.rdoc].
      module ClassMethods
        # All association reflections defined for this model (default: {}).
        attr_reader :association_reflections

        # Hash with column symbol keys and arrays of many_to_one
        # association symbols that should be cleared when the column
        # value changes.
        attr_reader :autoreloading_associations

        # Whether association metadata should be cached in the association reflection.  If not cached, it will be computed
        # on demand.  In general you only want to set this to false when using code reloading.  When using code reloading,
        # setting this will make sure that if an associated class is removed or modified, this class will not have a reference to
        # the previous class.
        attr_accessor :cache_associations

        # The default options to use for all associations.  This hash is merged into the association reflection hash for
        # all association reflections.
        attr_accessor :default_association_options

        # The default options to use for all associations of a given type.  This is a hash keyed by association type
        # symbol.  If there is a value for the association type symbol key, the resulting hash will be merged into the
        # association reflection hash for all association reflections of that type.
        attr_accessor :default_association_type_options

        # The default :eager_limit_strategy option to use for limited or offset associations (default: true, causing Sequel
        # to use what it considers the most appropriate strategy).
        attr_accessor :default_eager_limit_strategy

        # Array of all association reflections for this model class
        def all_association_reflections
          association_reflections.values
        end
        
        # Associates a related model with the current model. The following types are
        # supported:
        #
        # :many_to_one :: Foreign key in current model's table points to 
        #                 associated model's primary key.  Each associated model object can
        #                 be associated with more than one current model objects.  Each current
        #                 model object can be associated with only one associated model object.
        # :one_to_many :: Foreign key in associated model's table points to this
        #                 model's primary key.   Each current model object can be associated with
        #                 more than one associated model objects.  Each associated model object
        #                 can be associated with only one current model object.
        # :one_through_one :: Similar to many_to_many in terms of foreign keys, but only one object
        #                     is associated to the current object through the association.
        #                     Provides only getter methods, no setter or modification methods.
        # :one_to_one :: Similar to one_to_many in terms of foreign keys, but
        #                only one object is associated to the current object through the
        #                association.  The methods created are similar to many_to_one, except
        #                that the one_to_one setter method saves the passed object.
        # :many_to_many :: A join table is used that has a foreign key that points
        #                  to this model's primary key and a foreign key that points to the
        #                  associated model's primary key.  Each current model object can be
        #                  associated with many associated model objects, and each associated
        #                  model object can be associated with many current model objects.
        #
        # The following options can be supplied:
        # === Multiple Types
        # :adder :: Proc used to define the private _add_* method for doing the database work
        #           to associate the given object to the current object (*_to_many assocations).
        # :after_add :: Symbol, Proc, or array of both/either specifying a callback to call
        #               after a new item is added to the association.
        # :after_load :: Symbol, Proc, or array of both/either specifying a callback to call
        #                after the associated record(s) have been retrieved from the database.
        # :after_remove :: Symbol, Proc, or array of both/either specifying a callback to call
        #                  after an item is removed from the association.
        # :after_set :: Symbol, Proc, or array of both/either specifying a callback to call
        #               after an item is set using the association setter method.
        # :allow_eager :: If set to false, you cannot load the association eagerly
        #                 via eager or eager_graph
        # :before_add :: Symbol, Proc, or array of both/either specifying a callback to call
        #                before a new item is added to the association.
        # :before_remove :: Symbol, Proc, or array of both/either specifying a callback to call
        #                   before an item is removed from the association.
        # :before_set :: Symbol, Proc, or array of both/either specifying a callback to call
        #                before an item is set using the association setter method.
        # :cartesian_product_number :: the number of joins completed by this association that could cause more
        #                              than one row for each row in the current table (default: 0 for
        #                              many_to_one, one_to_one, and one_through_one associations, 1
        #                              for one_to_many and many_to_many associations).
        # :class :: The associated class or its name as a string or symbol. If not
        #           given, uses the association's name, which is camelized (and
        #           singularized unless the type is :many_to_one, :one_to_one, or one_through_one).  If this is specified
        #           as a string or symbol, you must specify the full class name (e.g. "::SomeModule::MyModel"). 
        # :class_namespace :: If :class is given as a string or symbol, sets the default namespace in which to look for
        #                     the class.  <tt>class: 'Foo', class_namespace: 'Bar'</tt> looks for <tt>::Bar::Foo</tt>.)
        # :clearer :: Proc used to define the private _remove_all_* method for doing the database work
        #             to remove all objects associated to the current object (*_to_many assocations).
        # :clone :: Merge the current options and block into the options and block used in defining
        #           the given association.  Can be used to DRY up a bunch of similar associations that
        #           all share the same options such as :class and :key, while changing the order and block used.
        # :conditions :: The conditions to use to filter the association, can be any argument passed to where.
        #                This option is not respected when using eager_graph or association_join, unless it
        #                is hash or array of two element arrays.  Consider also specifying the :graph_block
        #                option if the value for this option is not a hash or array of two element arrays
        #                and you plan to use this association in eager_graph or association_join.
        # :dataset :: A proc that is used to define the method to get the base dataset to use (before the other
        #             options are applied).  If the proc accepts an argument, it is passed the related
        #             association reflection.  It is a best practice to always have the dataset accept an argument
        #             and use the argument to return the appropriate dataset.
        # :distinct :: Use the DISTINCT clause when selecting associating object, both when
        #              lazy loading and eager loading via .eager (but not when using .eager_graph).
        # :eager :: The associations to eagerly load via +eager+ when loading the associated object(s).
        # :eager_block :: If given, use the block instead of the default block when
        #                 eagerly loading.  To not use a block when eager loading (when one is used normally),
        #                 set to nil.
        # :eager_graph :: The associations to eagerly load via +eager_graph+ when loading the associated object(s).
        #                 many_to_many associations with this option cannot be eagerly loaded via +eager+.
        # :eager_grapher :: A proc to use to implement eager loading via +eager_graph+, overriding the default.
        #                   Takes an options hash with at least the entries :self (the receiver of the eager_graph call),
        #                   :table_alias (the alias to use for table to graph into the association), and :implicit_qualifier
        #                   (the alias that was used for the current table).
        #                   Should return a copy of the dataset with the association graphed into it.
        # :eager_limit_strategy :: Determines the strategy used for enforcing limits and offsets when eager loading
        #                          associations via the +eager+ method.  
        # :eager_loader :: A proc to use to implement eager loading, overriding the default.  Takes a single hash argument,
        #                  with at least the keys: :rows, which is an array of current model instances, :associations,
        #                  which is a hash of dependent associations, :self, which is the dataset doing the eager loading,
        #                  :eager_block, which is a dynamic callback that should be called with the dataset, and :id_map,
        #                  which is a mapping of key values to arrays of current model instances. In the proc, the
        #                  associated records should be queried from the database and the associations cache for each
        #                  record should be populated.
        # :eager_loader_key :: A symbol for the key column to use to populate the key_hash
        #                      for the eager loader.  Can be set to nil to not populate the key_hash.
        # :extend :: A module or array of modules to extend the dataset with.
        # :filter_limit_strategy :: Determines the strategy used for enforcing limits and offsets when filtering by
        #                           limited associations.  Possible options are :window_function, :distinct_on, or
        #                           :correlated_subquery depending on association type and database type.
        # :graph_alias_base :: The base name to use for the table alias when eager graphing.  Defaults to the name
        #                      of the association.  If the alias name has already been used in the query, Sequel will create
        #                      a unique alias by appending a numeric suffix (e.g. alias_0, alias_1, ...) until the alias is
        #                      unique.
        # :graph_block :: The block to pass to join_table when eagerly loading
        #                 the association via +eager_graph+.
        # :graph_conditions :: The additional conditions to use on the SQL join when eagerly loading
        #                      the association via +eager_graph+.  Should be a hash or an array of two element arrays. If not
        #                      specified, the :conditions option is used if it is a hash or array of two element arrays.
        # :graph_join_type :: The type of SQL join to use when eagerly loading the association via
        #                     eager_graph.  Defaults to :left_outer.
        # :graph_only_conditions :: The conditions to use on the SQL join when eagerly loading
        #                           the association via +eager_graph+, instead of the default conditions specified by the
        #                           foreign/primary keys.  This option causes the :graph_conditions option to be ignored.
        # :graph_order :: Over the order to use when using eager_graph, instead of the default order.  This should be used
        #                 in the case where :order contains an identifier qualified by the table's name, which may not match
        #                 the alias used when eager graphing.  By setting this to the unqualified identifier, it will be
        #                 automatically qualified when using eager_graph.
        # :graph_select :: A column or array of columns to select from the associated table
        #                  when eagerly loading the association via +eager_graph+. Defaults to all
        #                  columns in the associated table.
        # :limit :: Limit the number of records to the provided value.  Use
        #           an array with two elements for the value to specify a
        #           limit (first element) and an offset (second element).
        # :methods_module :: The module that methods the association creates will be placed into. Defaults
        #                    to the module containing the model's columns.
        # :order :: the column(s) by which to order the association dataset.  Can be a
        #           singular column symbol or an array of column symbols.
        # :order_eager_graph :: Whether to add the association's order to the graphed dataset's order when graphing
        #                       via +eager_graph+.  Defaults to true, so set to false to disable.
        # :read_only :: Do not add a setter method (for many_to_one or one_to_one associations),
        #               or add_/remove_/remove_all_ methods (for one_to_many and many_to_many associations).
        # :reciprocal :: the symbol name of the reciprocal association,
        #                if it exists.  By default, Sequel will try to determine it by looking at the
        #                associated model's assocations for a association that matches
        #                the current association's key(s).  Set to nil to not use a reciprocal.
        # :remover :: Proc used to define the private _remove_* method for doing the database work
        #             to remove the association between the given object and the current object (*_to_many assocations).
        # :select :: the columns to select.  Defaults to the associated class's table_name.* in an association
        #            that uses joins, which means it doesn't include the attributes from the
        #            join table.  If you want to include the join table attributes, you can
        #            use this option, but beware that the join table attributes can clash with
        #            attributes from the model table, so you should alias any attributes that have
        #            the same name in both the join table and the associated table.
        # :setter :: Proc used to define the private _*= method for doing the work to setup the assocation
        #            between the given object and the current object (*_to_one associations).
        # :subqueries_per_union :: The number of subqueries to use in each UNION query, for eager
        #                          loading limited associations using the default :union strategy.
        # :validate :: Set to false to not validate when implicitly saving any associated object.
        # === :many_to_one
        # :key :: foreign key in current model's table that references
        #         associated model's primary key, as a symbol.  Defaults to :"#{name}_id".  Can use an
        #         array of symbols for a composite key association.
        # :key_column :: Similar to, and usually identical to, :key, but :key refers to the model method
        #                to call, where :key_column refers to the underlying column.  Should only be
        #                used if the model method differs from the foreign key column, in conjunction
        #                with defining a model alias method for the key column.
        # :primary_key :: column in the associated table that :key option references, as a symbol.
        #                 Defaults to the primary key of the associated table. Can use an
        #                 array of symbols for a composite key association.
        # :primary_key_method :: the method symbol or array of method symbols to call on the associated
        #                        object to get the foreign key values.  Defaults to :primary_key option.
        # :qualify :: Whether to use qualified primary keys when loading the association.  The default
        #             is true, so you must set to false to not qualify.  Qualification rarely causes
        #             problems, but it's necessary to disable in some cases, such as when you are doing
        #             a JOIN USING operation on the column on Oracle.
        # === :one_to_many and :one_to_one
        # :key :: foreign key in associated model's table that references
        #         current model's primary key, as a symbol.  Defaults to
        #         :"#{self.name.underscore}_id".  Can use an
        #         array of symbols for a composite key association.
        # :key_method :: the method symbol or array of method symbols to call on the associated
        #                object to get the foreign key values.  Defaults to :key option.
        # :primary_key :: column in the current table that :key option references, as a symbol.
        #                 Defaults to primary key of the current table. Can use an
        #                 array of symbols for a composite key association.
        # :primary_key_column :: Similar to, and usually identical to, :primary_key, but :primary_key refers
        #                        to the model method call, where :primary_key_column refers to the underlying column.
        #                        Should only be used if the model method differs from the primary key column, in
        #                        conjunction with defining a model alias method for the primary key column.
        # :raise_on_save_failure :: Do not raise exceptions for hook or validation failures when saving associated
        #                           objects in the add/remove methods (return nil instead) [one_to_many only].
        # === :many_to_many and :one_through_one
        # :graph_join_table_block :: The block to pass to +join_table+ for
        #                            the join table when eagerly loading the association via +eager_graph+.
        # :graph_join_table_conditions :: The additional conditions to use on the SQL join for
        #                                 the join table when eagerly loading the association via +eager_graph+.
        #                                 Should be a hash or an array of two element arrays.
        # :graph_join_table_join_type :: The type of SQL join to use for the join table when eagerly
        #                                loading the association via +eager_graph+.  Defaults to the
        #                                :graph_join_type option or :left_outer.
        # :graph_join_table_only_conditions :: The conditions to use on the SQL join for the join
        #                                      table when eagerly loading the association via +eager_graph+,
        #                                      instead of the default conditions specified by the
        #                                      foreign/primary keys.  This option causes the
        #                                      :graph_join_table_conditions option to be ignored.
        # :join_table :: name of table that includes the foreign keys to both
        #                the current model and the associated model, as a symbol.  Defaults to the name
        #                of current model and name of associated model, pluralized,
        #                underscored, sorted, and joined with '_'.
        # :join_table_block :: proc that can be used to modify the dataset used in the add/remove/remove_all
        #                      methods.  Should accept a dataset argument and return a modified dataset if present.
        # :left_key :: foreign key in join table that points to current model's
        #              primary key, as a symbol. Defaults to :"#{self.name.underscore}_id".
        #              Can use an array of symbols for a composite key association.
        # :left_primary_key :: column in current table that :left_key points to, as a symbol.
        #                      Defaults to primary key of current table.  Can use an
        #                      array of symbols for a composite key association.
        # :left_primary_key_column :: Similar to, and usually identical to, :left_primary_key, but :left_primary_key refers to
        #                             the model method to call, where :left_primary_key_column refers to the underlying column.  Should only
        #                             be used if the model method differs from the left primary key column, in conjunction
        #                             with defining a model alias method for the left primary key column.
        # :right_key :: foreign key in join table that points to associated
        #               model's primary key, as a symbol.  Defaults to :"#{name.to_s.singularize}_id".
        #               Can use an array of symbols for a composite key association.
        # :right_primary_key :: column in associated table that :right_key points to, as a symbol.
        #                       Defaults to primary key of the associated table.  Can use an
        #                       array of symbols for a composite key association.
        # :right_primary_key_method :: the method symbol or array of method symbols to call on the associated
        #                              object to get the foreign key values for the join table.
        #                              Defaults to :right_primary_key option.
        # :uniq :: Adds a after_load callback that makes the array of objects unique.
        def associate(type, name, opts = OPTS, &block)
          raise(Error, 'invalid association type') unless assoc_class = Sequel.synchronize{ASSOCIATION_TYPES[type]}
          raise(Error, 'Model.associate name argument must be a symbol') unless name.is_a?(Symbol)

          # dup early so we don't modify opts
          orig_opts = opts.dup

          if opts[:clone]
            cloned_assoc = association_reflection(opts[:clone])
            orig_opts = cloned_assoc[:orig_opts].merge(orig_opts)
          end

          opts = Hash[default_association_options]
          if type_options = default_association_type_options[type]
            opts.merge!(type_options)
          end
          opts.merge!(orig_opts)
          opts.merge!(:type => type, :name => name, :cache=>({} if cache_associations), :model => self)

          opts[:block] = block if block
          if !opts.has_key?(:instance_specific) && (block || orig_opts[:block] || orig_opts[:dataset])
            # It's possible the association is instance specific, in that it depends on
            # values other than the foreign key value.  This needs to be checked for
            # in certain places to disable optimizations.
            opts[:instance_specific] = true
          end
          opts = assoc_class.new.merge!(opts)

          if opts[:clone] && !opts.cloneable?(cloned_assoc)
            raise(Error, "cannot clone an association to an association of different type (association #{name} with type #{type} cloning #{opts[:clone]} with type #{cloned_assoc[:type]})")
          end

          opts[:eager_block] = opts[:block] unless opts.include?(:eager_block)
          opts[:graph_join_type] ||= :left_outer
          opts[:order_eager_graph] = true unless opts.include?(:order_eager_graph)
          conds = opts[:conditions]
          opts[:graph_alias_base] ||= name
          opts[:graph_conditions] = conds if !opts.include?(:graph_conditions) and Sequel.condition_specifier?(conds)
          opts[:graph_conditions] = opts.fetch(:graph_conditions, []).to_a
          opts[:graph_select] = Array(opts[:graph_select]) if opts[:graph_select]
          [:before_add, :before_remove, :after_add, :after_remove, :after_load, :before_set, :after_set].each do |cb_type|
            opts[cb_type] = Array(opts[cb_type]) if opts[cb_type]
          end

          if opts[:extend]
            opts[:extend] = Array(opts[:extend])
            opts[:reverse_extend] = opts[:extend].reverse
          end

          late_binding_class_option(opts, opts.returns_array? ? singularize(name) : name)
          
          # Remove :class entry if it exists and is nil, to work with cached_fetch
          opts.delete(:class) unless opts[:class]

          send(:"def_#{type}", opts)
          def_association_instance_methods(opts)
      
          orig_opts.delete(:clone)
          opts[:orig_class] = orig_opts[:class] || orig_opts[:class_name]
          orig_opts.merge!(:class_name=>opts[:class_name], :class=>opts[:class], :block=>opts[:block])
          opts[:orig_opts] = orig_opts
          # don't add to association_reflections until we are sure there are no errors
          association_reflections[name] = opts
        end
        
        # The association reflection hash for the association of the given name.
        def association_reflection(name)
          association_reflections[name]
        end
        
        # Array of association name symbols
        def associations
          association_reflections.keys
        end

        # Eager load the association with the given eager loader options.
        def eager_load_results(opts, eo, &block)
          opts.eager_load_results(eo, &block)
        end

        # Freeze association related metadata when freezing model class.
        def freeze
          @association_reflections.freeze.each_value(&:freeze)
          @autoreloading_associations.freeze.each_value(&:freeze)
          @default_association_options.freeze
          @default_association_type_options.freeze
          @default_association_type_options.each_value(&:freeze)

          super
        end

        # Finalize all associations such that values that are looked up
        # dynamically in associated classes are set statically.
        # As this modifies the associations, it must be done before
        # calling freeze.
        def finalize_associations
          @association_reflections.each_value(&:finalize)
        end

        # Shortcut for adding a many_to_many association, see #associate
        def many_to_many(name, opts=OPTS, &block)
          associate(:many_to_many, name, opts, &block)
        end
        
        # Shortcut for adding a many_to_one association, see #associate
        def many_to_one(name, opts=OPTS, &block)
          associate(:many_to_one, name, opts, &block)
        end
        
        # Shortcut for adding a one_through_one association, see #associate
        def one_through_one(name, opts=OPTS, &block)
          associate(:one_through_one, name, opts, &block)
        end

        # Shortcut for adding a one_to_many association, see #associate
        def one_to_many(name, opts=OPTS, &block)
          associate(:one_to_many, name, opts, &block)
        end

        # Shortcut for adding a one_to_one association, see #associate
        def one_to_one(name, opts=OPTS, &block)
          associate(:one_to_one, name, opts, &block)
        end

        Plugins.inherited_instance_variables(self, :@association_reflections=>:dup, :@autoreloading_associations=>:hash_dup, :@default_association_options=>:dup, :@default_association_type_options=>:hash_dup, :@cache_associations=>nil, :@default_eager_limit_strategy=>nil)
        Plugins.def_dataset_methods(self, [:eager, :eager_graph, :eager_graph_with_options, :association_join, :association_full_join, :association_inner_join, :association_left_join, :association_right_join])
        
        private
      
        # The module to use for the association's methods.  Defaults to
        # the overridable_methods_module.
        def association_module(opts=OPTS)
          opts.fetch(:methods_module, overridable_methods_module)
        end

        # Add a method to the module included in the class, so the method
        # can be easily overridden in the class itself while allowing for
        # super to be called.
        def association_module_def(name, opts=OPTS, &block)
          association_module(opts).send(:define_method, name, &block)
        end
      
        # Add a private method to the module included in the class.
        def association_module_private_def(name, opts=OPTS, &block)
          association_module_def(name, opts, &block)
          association_module(opts).send(:private, name)
        end

        # Adds the association method to the association methods module.
        def def_association_method(opts)
          association_module_def(opts.association_method, opts) do |dynamic_opts=OPTS, &block|
            load_associated_objects(opts, dynamic_opts, &block)
          end
        end
      
        # Define all of the association instance methods for this association.
        def def_association_instance_methods(opts)
          # Always set the method names in the association reflection, even if they
          # are not used, for backwards compatibility.
          opts[:dataset_method] = :"#{opts[:name]}_dataset"
          if opts.returns_array?
            sname = singularize(opts[:name])
            opts[:_add_method] = :"_add_#{sname}"
            opts[:add_method] = :"add_#{sname}"
            opts[:_remove_method] = :"_remove_#{sname}"
            opts[:remove_method] = :"remove_#{sname}"
            opts[:_remove_all_method] = :"_remove_all_#{opts[:name]}"
            opts[:remove_all_method] = :"remove_all_#{opts[:name]}"
          else
            opts[:_setter_method] = :"_#{opts[:name]}="
            opts[:setter_method] = :"#{opts[:name]}="
          end

          association_module_def(opts.dataset_method, opts){_dataset(opts)}
          if opts[:block]
            opts[:block_method] = Plugins.def_sequel_method(association_module(opts), "#{opts[:name]}_block", 1, &opts[:block])
          end
          if opts[:dataset]
            opts[:dataset_opt_arity] = opts[:dataset].arity == 0 ? 0 : 1
            opts[:dataset_opt_method] = Plugins.def_sequel_method(association_module(opts), "#{opts[:name]}_dataset_opt", opts[:dataset_opt_arity], &opts[:dataset])
          end
          def_association_method(opts)

          return if opts[:read_only]

          if opts[:setter] && opts[:_setter]
            # This is backwards due to backwards compatibility
            association_module_private_def(opts[:_setter_method], opts, &opts[:setter])
            association_module_def(opts[:setter_method], opts, &opts[:_setter])
          end

          if adder = opts[:adder]
            association_module_private_def(opts[:_add_method], opts, &adder)
            association_module_def(opts[:add_method], opts){|o,*args| add_associated_object(opts, o, *args)}
          end

          if remover = opts[:remover]
            association_module_private_def(opts[:_remove_method], opts, &remover)
            association_module_def(opts[:remove_method], opts){|o,*args| remove_associated_object(opts, o, *args)}
          end

          if clearer = opts[:clearer]
            association_module_private_def(opts[:_remove_all_method], opts, &clearer)
            association_module_def(opts[:remove_all_method], opts){|*args| remove_all_associated_objects(opts, *args)}
          end
        end
        
        # Configures many_to_many and one_through_one association reflection and adds the related association methods
        def def_many_to_many(opts)
          one_through_one = opts[:type] == :one_through_one
          left = (opts[:left_key] ||= opts.default_left_key)
          lcks = opts[:left_keys] = Array(left)
          right = (opts[:right_key] ||= opts.default_right_key)
          rcks = opts[:right_keys] = Array(right)
          left_pk = (opts[:left_primary_key] ||= self.primary_key)
          opts[:eager_loader_key] = left_pk unless opts.has_key?(:eager_loader_key)
          lcpks = opts[:left_primary_keys] = Array(left_pk)
          lpkc = opts[:left_primary_key_column] ||= left_pk
          lpkcs = opts[:left_primary_key_columns] ||= Array(lpkc)
          raise(Error, "mismatched number of left keys: #{lcks.inspect} vs #{lcpks.inspect}") unless lcks.length == lcpks.length
          if opts[:right_primary_key]
            rcpks = Array(opts[:right_primary_key])
            raise(Error, "mismatched number of right keys: #{rcks.inspect} vs #{rcpks.inspect}") unless rcks.length == rcpks.length
          end
          opts[:uses_left_composite_keys] = lcks.length > 1
          opts[:uses_right_composite_keys] = rcks.length > 1
          opts[:cartesian_product_number] ||= one_through_one ? 0 : 1
          join_table = (opts[:join_table] ||= opts.default_join_table)
          opts[:left_key_alias] ||= opts.default_associated_key_alias
          opts[:graph_join_table_join_type] ||= opts[:graph_join_type]
          if opts[:uniq]
            opts[:after_load] ||= []
            opts[:after_load].unshift(:array_uniq!)
          end
          opts[:dataset] ||= opts.association_dataset_proc
          opts[:eager_loader] ||= opts.method(:default_eager_loader)
          
          join_type = opts[:graph_join_type]
          select = opts[:graph_select]
          use_only_conditions = opts.include?(:graph_only_conditions)
          only_conditions = opts[:graph_only_conditions]
          conditions = opts[:graph_conditions]
          graph_block = opts[:graph_block]
          graph_jt_conds = opts[:graph_join_table_conditions] = opts.fetch(:graph_join_table_conditions, []).to_a
          use_jt_only_conditions = opts.include?(:graph_join_table_only_conditions)
          jt_only_conditions = opts[:graph_join_table_only_conditions]
          jt_join_type = opts[:graph_join_table_join_type]
          jt_graph_block = opts[:graph_join_table_block]
          opts[:eager_grapher] ||= proc do |eo|
            ds = eo[:self]
            egls = eo[:limit_strategy]
            if egls && egls != :ruby
              associated_key_array = opts.associated_key_array
              orig_egds = egds = eager_graph_dataset(opts, eo)
              egds = egds.
                inner_join(join_table, rcks.zip(opts.right_primary_keys) + graph_jt_conds, :qualify=>:deep).
                select_all(egds.first_source).
                select_append(*associated_key_array)
              egds = opts.apply_eager_graph_limit_strategy(egls, egds)
              ds.graph(egds, associated_key_array.map(&:alias).zip(lpkcs) + conditions, :qualify=>:deep, :table_alias=>eo[:table_alias], :implicit_qualifier=>eo[:implicit_qualifier], :join_type=>eo[:join_type]||join_type, :from_self_alias=>eo[:from_self_alias], :join_only=>eo[:join_only], :select=>select||orig_egds.columns, &graph_block)
            else
              ds = ds.graph(join_table, use_jt_only_conditions ? jt_only_conditions : lcks.zip(lpkcs) + graph_jt_conds, :select=>false, :table_alias=>ds.unused_table_alias(join_table, [eo[:table_alias]]), :join_type=>eo[:join_type]||jt_join_type, :join_only=>eo[:join_only], :implicit_qualifier=>eo[:implicit_qualifier], :qualify=>:deep, :from_self_alias=>eo[:from_self_alias], &jt_graph_block)
              ds.graph(eager_graph_dataset(opts, eo), use_only_conditions ? only_conditions : opts.right_primary_keys.zip(rcks) + conditions, :select=>select, :table_alias=>eo[:table_alias], :qualify=>:deep, :join_type=>eo[:join_type]||join_type, :join_only=>eo[:join_only], &graph_block)
            end
          end
      
          return if opts[:read_only]
      
          if one_through_one
            opts[:setter] ||= proc do |o|
              h = {}
              lh = lcks.zip(lcpks.map{|k| get_column_value(k)})
              jtds = _join_table_dataset(opts).where(lh)

              checked_transaction do
                current = jtds.first

                if o
                  new_values = []
                  rcks.zip(opts.right_primary_key_methods).each{|k, pk| new_values << (h[k] = o.get_column_value(pk))}
                end

                if current
                  current_values = rcks.map{|k| current[k]}
                  jtds = jtds.where(rcks.zip(current_values))
                  if o
                    if current_values != new_values
                      jtds.update(h)
                    end
                  else
                    jtds.delete
                  end
                elsif o
                  lh.each{|k,v| h[k] = v}
                  jtds.insert(h)
                end
              end
            end
            opts[:_setter] = proc{|o| set_one_through_one_associated_object(opts, o)}
          else 
            opts[:adder] ||= proc do |o|
              h = {}
              lcks.zip(lcpks).each{|k, pk| h[k] = get_column_value(pk)}
              rcks.zip(opts.right_primary_key_methods).each{|k, pk| h[k] = o.get_column_value(pk)}
              _join_table_dataset(opts).insert(h)
            end

            opts[:remover] ||= proc do |o|
              _join_table_dataset(opts).where(lcks.zip(lcpks.map{|k| get_column_value(k)}) + rcks.zip(opts.right_primary_key_methods.map{|k| o.get_column_value(k)})).delete
            end

            opts[:clearer] ||= proc do
              _join_table_dataset(opts).where(lcks.zip(lcpks.map{|k| get_column_value(k)})).delete
            end
          end
        end

        # Configures many_to_one association reflection and adds the related association methods
        def def_many_to_one(opts)
          name = opts[:name]
          opts[:key] = opts.default_key unless opts.has_key?(:key)
          key = opts[:key]
          opts[:eager_loader_key] = key unless opts.has_key?(:eager_loader_key)
          cks = opts[:graph_keys] = opts[:keys] = Array(key)
          opts[:key_column] ||= key
          opts[:graph_keys] = opts[:key_columns] = Array(opts[:key_column])
          opts[:qualified_key] = opts.qualify_cur(key)
          if opts[:primary_key]
            cpks = Array(opts[:primary_key])
            raise(Error, "mismatched number of keys: #{cks.inspect} vs #{cpks.inspect}") unless cks.length == cpks.length
          end
          uses_cks = opts[:uses_composite_keys] = cks.length > 1
          opts[:cartesian_product_number] ||= 0

          if !opts.has_key?(:many_to_one_pk_lookup) &&
             (opts[:dataset] || opts[:conditions] || opts[:block] || opts[:select] ||
              (opts.has_key?(:key) && opts[:key] == nil))
            opts[:many_to_one_pk_lookup] = false
          end
          auto_assocs = @autoreloading_associations
          cks.each do |k|
            (auto_assocs[k] ||= []) << name
          end

          opts[:dataset] ||= opts.association_dataset_proc
          opts[:eager_loader] ||= proc do |eo|
            h = eo[:id_map]
            pk_meths = opts.primary_key_methods

            eager_load_results(opts, eo) do |assoc_record|
              hash_key = uses_cks ? pk_meths.map{|k| assoc_record.get_column_value(k)} : assoc_record.get_column_value(opts.primary_key_method)
              if objects = h[hash_key]
                objects.each{|object| object.associations[name] = assoc_record}
              end
            end
          end
      
          join_type = opts[:graph_join_type]
          select = opts[:graph_select]
          use_only_conditions = opts.include?(:graph_only_conditions)
          only_conditions = opts[:graph_only_conditions]
          conditions = opts[:graph_conditions]
          graph_block = opts[:graph_block]
          graph_cks = opts[:graph_keys]
          opts[:eager_grapher] ||= proc do |eo|
            ds = eo[:self]
            ds.graph(eager_graph_dataset(opts, eo), use_only_conditions ? only_conditions : opts.primary_keys.zip(graph_cks) + conditions, eo.merge(:select=>select, :join_type=>eo[:join_type]||join_type, :qualify=>:deep), &graph_block)
          end
      
          return if opts[:read_only]
      
          opts[:setter] ||= proc{|o| cks.zip(opts.primary_key_methods).each{|k, pk| set_column_value(:"#{k}=", (o.get_column_value(pk) if o))}}
          opts[:_setter] = proc{|o| set_associated_object(opts, o)}
        end
        
        # Configures one_to_many and one_to_one association reflections and adds the related association methods
        def def_one_to_many(opts)
          one_to_one = opts[:type] == :one_to_one
          name = opts[:name]
          key = (opts[:key] ||= opts.default_key)
          km = opts[:key_method] ||= opts[:key]
          cks = opts[:keys] = Array(key)
          opts[:key_methods] = Array(opts[:key_method])
          primary_key = (opts[:primary_key] ||= self.primary_key)
          opts[:eager_loader_key] = primary_key unless opts.has_key?(:eager_loader_key)
          cpks = opts[:primary_keys] = Array(primary_key)
          pkc = opts[:primary_key_column] ||= primary_key
          pkcs = opts[:primary_key_columns] ||= Array(pkc)
          raise(Error, "mismatched number of keys: #{cks.inspect} vs #{cpks.inspect}") unless cks.length == cpks.length
          uses_cks = opts[:uses_composite_keys] = cks.length > 1
          opts[:dataset] ||= opts.association_dataset_proc
          opts[:eager_loader] ||= proc do |eo|
            h = eo[:id_map]
            reciprocal = opts.reciprocal
            assign_singular = opts.assign_singular?
            delete_rn = opts.delete_row_number_column

            eager_load_results(opts, eo) do |assoc_record|
              assoc_record.values.delete(delete_rn) if delete_rn
              hash_key = uses_cks ? km.map{|k| assoc_record.get_column_value(k)} : assoc_record.get_column_value(km)
              next unless objects = h[hash_key]
              if assign_singular
                objects.each do |object| 
                  unless object.associations[name]
                    object.associations[name] = assoc_record
                    assoc_record.associations[reciprocal] = object if reciprocal
                  end
                end
              else
                objects.each do |object| 
                  object.associations[name].push(assoc_record)
                  assoc_record.associations[reciprocal] = object if reciprocal
                end
              end
            end
          end
          
          join_type = opts[:graph_join_type]
          select = opts[:graph_select]
          use_only_conditions = opts.include?(:graph_only_conditions)
          only_conditions = opts[:graph_only_conditions]
          conditions = opts[:graph_conditions]
          opts[:cartesian_product_number] ||= one_to_one ? 0 : 1
          graph_block = opts[:graph_block]
          opts[:eager_grapher] ||= proc do |eo|
            ds = eo[:self]
            ds = ds.graph(opts.apply_eager_graph_limit_strategy(eo[:limit_strategy], eager_graph_dataset(opts, eo)), use_only_conditions ? only_conditions : cks.zip(pkcs) + conditions, eo.merge(:select=>select, :join_type=>eo[:join_type]||join_type, :qualify=>:deep), &graph_block)
            # We only load reciprocals for one_to_many associations, as other reciprocals don't make sense
            ds.opts[:eager_graph][:reciprocals][eo[:table_alias]] = opts.reciprocal
            ds
          end
      
          return if opts[:read_only]

          save_opts = {:validate=>opts[:validate]}
          ck_nil_hash ={}
          cks.each{|k| ck_nil_hash[k] = nil}

          if one_to_one
            opts[:setter] ||= proc do |o|
              up_ds = _apply_association_options(opts, opts.associated_dataset.where(cks.zip(cpks.map{|k| get_column_value(k)})))

              if (froms = up_ds.opts[:from]) && (from = froms[0]) && (from.is_a?(Sequel::Dataset) || (from.is_a?(Sequel::SQL::AliasedExpression) && from.expression.is_a?(Sequel::Dataset)))
                if old = up_ds.first
                  cks.each{|k| old.set_column_value(:"#{k}=", nil)}
                end
                save_old = true
              end

              if o
                if !o.new? && !save_old
                  up_ds = up_ds.exclude(o.pk_hash)
                end
                cks.zip(cpks).each{|k, pk| o.set_column_value(:"#{k}=", get_column_value(pk))}
              end

              checked_transaction do
                if save_old
                  old.save(save_opts) || raise(Sequel::Error, "invalid previously associated object, cannot save") if old
                else
                  up_ds.skip_limit_check.update(ck_nil_hash)
                end

                o.save(save_opts) || raise(Sequel::Error, "invalid associated object, cannot save") if o
              end
            end
            opts[:_setter] = proc{|o| set_one_to_one_associated_object(opts, o)}
          else 
            save_opts[:raise_on_failure] = opts[:raise_on_save_failure] != false

            opts[:adder] ||= proc do |o|
              cks.zip(cpks).each{|k, pk| o.set_column_value(:"#{k}=", get_column_value(pk))}
              o.save(save_opts)
            end
    
            opts[:remover] ||= proc do |o|
              cks.each{|k| o.set_column_value(:"#{k}=", nil)}
              o.save(save_opts)
            end

            opts[:clearer] ||= proc do
              _apply_association_options(opts, opts.associated_dataset.where(cks.zip(cpks.map{|k| get_column_value(k)}))).update(ck_nil_hash)
            end
          end
        end

        # Alias of def_many_to_many, since they share pretty much the same code.
        def def_one_through_one(opts)
          def_many_to_many(opts)
        end
        
        # Alias of def_one_to_many, since they share pretty much the same code.
        def def_one_to_one(opts)
          def_one_to_many(opts)
        end
        
        # Return dataset to graph into given the association reflection, applying the :callback option if set.
        def eager_graph_dataset(opts, eager_options)
          ds = opts.associated_class.dataset
          if cb = eager_options[:callback]
            ds = cb.call(ds)
          end
          ds
        end

        # If not caching associations, reload the database schema by default,
        # ignoring any cached values.
        def reload_db_schema?
          !@cache_associations
        end
      end

      # Instance methods used to implement the associations support.
      module InstanceMethods
        # The currently cached associations.  A hash with the keys being the
        # association name symbols and the values being the associated object
        # or nil (many_to_one), or the array of associated objects (*_to_many).
        def associations
          @associations ||= {}
        end

        # Freeze the associations cache when freezing the object.  Note that
        # retrieving associations after freezing will still work in most cases,
        # but the associations will not be cached in the association cache.
        def freeze
          associations
          super
          associations.freeze
          self
        end
      
        private
        
        # Apply the association options such as :order and :limit to the given dataset, returning a modified dataset.
        def _apply_association_options(opts, ds)
          unless ds.kind_of?(AssociationDatasetMethods)
            ds = opts.apply_dataset_changes(ds)
          end
          ds = ds.clone(:model_object => self)
          ds = ds.eager_graph(opts[:eager_graph]) if opts[:eager_graph] && opts.eager_graph_lazy_dataset?
          # block method is private
          ds = send(opts[:block_method], ds) if opts[:block_method]
          ds
        end

        # Return a dataset for the association after applying any dynamic callback.
        def _associated_dataset(opts, dynamic_opts)
          ds = public_send(opts.dataset_method)
          if callback = dynamic_opts[:callback]
            ds = callback.call(ds)
          end
          ds
        end
        
        # A placeholder literalizer that can be used to load the association, or nil to not use one.
        def _associated_object_loader(opts, dynamic_opts)
          if !dynamic_opts[:callback] && (loader = opts.placeholder_loader)
            loader
          end
        end

        # Return an association dataset for the given association reflection
        def _dataset(opts)
          raise(Sequel::Error, "model object #{inspect} does not have a primary key") if opts.dataset_need_primary_key? && !pk
          ds = if opts[:dataset_opt_arity] == 1
            # dataset_opt_method is private
            send(opts[:dataset_opt_method], opts)
          else
            send(opts[:dataset_opt_method])
          end
          _apply_association_options(opts, ds)
        end

        # Dataset for the join table of the given many to many association reflection
        def _join_table_dataset(opts)
          ds = model.db.from(opts.join_table_source)
          opts[:join_table_block] ? opts[:join_table_block].call(ds) : ds
        end

        # Return the associated single object for the given association reflection and dynamic options
        # (or nil if no associated object).
        def _load_associated_object(opts, dynamic_opts)
          _load_associated_object_array(opts, dynamic_opts).first
        end

        # Return the associated single object using a primary key lookup on the associated class.
        def _load_associated_object_via_primary_key(opts)
          opts.associated_class.send(:primary_key_lookup, ((fk = opts[:key]).is_a?(Array) ? fk.map{|c| get_column_value(c)} : get_column_value(fk)))
        end

        # Load the associated objects for the given association reflection and dynamic options
        # as an array.
        def _load_associated_object_array(opts, dynamic_opts)
          if loader = _associated_object_loader(opts, dynamic_opts)
            loader.all(*opts.predicate_key_values(self))
          else
            _associated_dataset(opts, dynamic_opts).all
          end
        end

        # Return the associated objects from the dataset, without association callbacks, reciprocals, and caching.
        # Still apply the dynamic callback if present.
        def _load_associated_objects(opts, dynamic_opts=OPTS)
          if opts.can_have_associated_objects?(self)
            if opts.returns_array?
              _load_associated_object_array(opts, dynamic_opts)
            elsif load_with_primary_key_lookup?(opts, dynamic_opts)
              _load_associated_object_via_primary_key(opts)
            else
              _load_associated_object(opts, dynamic_opts)
            end
          elsif opts.returns_array?
            []
          end
        end

        # Clear the associations cache when refreshing
        def _refresh_set_values(hash)
          @associations.clear if @associations
          super
        end

        # Add the given associated object to the given association
        def add_associated_object(opts, o, *args)
          o = make_add_associated_object(opts, o)
          raise(Sequel::Error, "model object #{inspect} does not have a primary key") if opts.dataset_need_primary_key? && !pk
          ensure_associated_primary_key(opts, o, *args)
          return if run_association_callbacks(opts, :before_add, o) == false
          # Allow calling private _add method
          return if !send(opts[:_add_method], o, *args) && opts.handle_silent_modification_failure?
          if array = associations[opts[:name]] and !array.include?(o)
            array.push(o)
          end
          add_reciprocal_object(opts, o)
          run_association_callbacks(opts, :after_add, o)
          o
        end

        # Add/Set the current object to/as the given object's reciprocal association.
        def add_reciprocal_object(opts, o)
          return if o.frozen?
          return unless reciprocal = opts.reciprocal
          if opts.reciprocal_array?
            if array = o.associations[reciprocal] and !array.include?(self)
              array.push(self)
            end
          else
            o.associations[reciprocal] = self
          end
        end
        
        # Call uniq! on the given array. This is used by the :uniq option,
        # and is an actual method for memory reasons.
        def array_uniq!(a)
          a.uniq!
        end

        # If a foreign key column value changes, clear the related
        # cached associations.
        def change_column_value(column, value)
          if assocs = model.autoreloading_associations[column]
            vals = @values
            if new?
              # Do deeper checking for new objects, so that associations are
              # not deleted when values do not change.  This code is run at
              # a higher level for existing objects.
              if value == (c = vals[column]) && value.class == c.class
                # If the value is the same, there is no reason to delete
                # the related associations, so exit early in that case.
                return super
              end

              only_delete_nil = c.nil?
            elsif vals[column].nil?
              only_delete_nil = true
            end

            if only_delete_nil
              # If the current foreign key value is nil, but the association
              # is already present in the cache, it was probably added to the
              # cache for a reason, and we do not want to delete it in that case.
              # However, we still want to delete associations with nil values
              # to remove the cached false negative.
              assocs.each{|a| associations.delete(a) if associations[a].nil?}
            else
              assocs.each{|a| associations.delete(a)}
            end
          end
          super
        end

        # Save the associated object if the associated object needs a primary key
        # and the associated object is new and does not have one.  Raise an error if
        # the object still does not have a primary key
        def ensure_associated_primary_key(opts, o, *args)
          if opts.need_associated_primary_key?
            o.save(:validate=>opts[:validate]) if o.new?
            raise(Sequel::Error, "associated object #{o.inspect} does not have a primary key") unless o.pk
          end
        end

        # Duplicate the associations hash when duplicating the object.
        def initialize_copy(other)
          super
          @associations = Hash[@associations] if @associations
          self
        end

        # If a block is given, assign it as the :callback option in the hash, and return the hash.
        def load_association_objects_options(dynamic_opts, &block)
          if block
            dynamic_opts = Hash[dynamic_opts]
            dynamic_opts[:callback] = block
          end

          dynamic_opts
        end

        # Load the associated objects using the dataset, handling callbacks, reciprocals, and caching.
        def load_associated_objects(opts, dynamic_opts, &block)
          dynamic_opts = load_association_objects_options(dynamic_opts, &block)
          name = opts[:name]
          if associations.include?(name) && !dynamic_opts[:callback] && !dynamic_opts[:reload]
            associations[name]
          else
            objs = _load_associated_objects(opts, dynamic_opts)
            if opts.set_reciprocal_to_self?
              if opts.returns_array?
                objs.each{|o| add_reciprocal_object(opts, o)}
              elsif objs
                add_reciprocal_object(opts, objs)
              end
            end

            # If the current object is frozen, you can't update the associations
            # cache.  This can cause issues for after_load procs that expect
            # the objects to be already cached in the associations, but
            # unfortunately that case cannot be handled.
            associations[name] = objs unless frozen?
            run_association_callbacks(opts, :after_load, objs)
            frozen? ? objs : associations[name]
          end
        end

        # Whether to use a simple primary key lookup on the associated class when loading.
        def load_with_primary_key_lookup?(opts, dynamic_opts)
          opts[:type] == :many_to_one &&
            !dynamic_opts[:callback] && 
            opts.send(:cached_fetch, :many_to_one_pk_lookup){opts.primary_key == opts.associated_class.primary_key}
        end
        
        # Convert the input of the add_* association method into an associated object. For
        # hashes, this creates a new object using the hash.  For integers, strings, and arrays,
        # assume the value specifies a primary key, and lookup an existing object with that primary key.
        # Otherwise, if the object is not already an instance of the class, raise an exception.
        def make_add_associated_object(opts, o)
          klass = opts.associated_class

          case o
          when Hash
            klass.new(o)
          when Integer, String, Array
            klass.with_pk!(o)
          when klass
            o
          else 
            raise(Sequel::Error, "associated object #{o.inspect} not of correct type #{klass}")
          end
        end

        # Remove all associated objects from the given association
        def remove_all_associated_objects(opts, *args)
          raise(Sequel::Error, "model object #{inspect} does not have a primary key") if opts.dataset_need_primary_key? && !pk
          # Allow calling private _remove_all method
          send(opts[:_remove_all_method], *args)
          ret = associations[opts[:name]].each{|o| remove_reciprocal_object(opts, o)} if associations.include?(opts[:name])
          associations[opts[:name]] = []
          ret
        end

        # Remove the given associated object from the given association
        def remove_associated_object(opts, o, *args)
          klass = opts.associated_class
          if o.is_a?(Integer) || o.is_a?(String) || o.is_a?(Array)
            o = remove_check_existing_object_from_pk(opts, o, *args)
          elsif !o.is_a?(klass)
            raise(Sequel::Error, "associated object #{o.inspect} not of correct type #{klass}")
          elsif opts.remove_should_check_existing? && public_send(opts.dataset_method).where(o.pk_hash).empty?
            raise(Sequel::Error, "associated object #{o.inspect} is not currently associated to #{inspect}")
          end
          raise(Sequel::Error, "model object #{inspect} does not have a primary key") if opts.dataset_need_primary_key? && !pk
          raise(Sequel::Error, "associated object #{o.inspect} does not have a primary key") if opts.need_associated_primary_key? && !o.pk
          return if run_association_callbacks(opts, :before_remove, o) == false
          # Allow calling private _remove method
          return if !send(opts[:_remove_method], o, *args) && opts.handle_silent_modification_failure?
          associations[opts[:name]].delete_if{|x| o === x} if associations.include?(opts[:name])
          remove_reciprocal_object(opts, o)
          run_association_callbacks(opts, :after_remove, o)
          o
        end

        # Check that the object from the associated table specified by the primary key
        # is currently associated to the receiver.  If it is associated, return the object, otherwise
        # raise an error.
        def remove_check_existing_object_from_pk(opts, o, *args)
          key = o
          pkh = opts.associated_class.qualified_primary_key_hash(key)
          raise(Sequel::Error, "no object with key(s) #{key.inspect} is currently associated to #{inspect}") unless o = public_send(opts.dataset_method).first(pkh)
          o
        end

        # Remove/unset the current object from/as the given object's reciprocal association.
        def remove_reciprocal_object(opts, o)
          return unless reciprocal = opts.reciprocal
          if opts.reciprocal_array?
            if array = o.associations[reciprocal]
              array.delete_if{|x| self === x}
            end
          else
            o.associations[reciprocal] = nil
          end
        end

        # Run the callback for the association with the object.
        def run_association_callbacks(reflection, callback_type, object)
          return unless cbs = reflection[callback_type]

          begin
            cbs.each do |cb|
              case cb
              when Symbol
                # Allow calling private methods in association callbacks
                send(cb, object)
              when Proc
                cb.call(self, object)
              else
                raise Error, "callbacks should either be Procs or Symbols"
              end
            end
          rescue HookFailed
            # The reason we automatically set raise_error for singular associations is that
            # assignment in ruby always returns the argument instead of the result of the
            # method, so we can't return nil to signal that the association callback prevented
            # the modification
            return false unless raise_on_save_failure || !reflection.returns_array?
            raise
          end
        end

        # Set the given object as the associated object for the given *_to_one association reflection
        def _set_associated_object(opts, o)
          a = associations[opts[:name]]
          reciprocal = opts.reciprocal
          if set_associated_object_if_same?
            if reciprocal
              remove_reciprocal = a && (a != o || a.associations[reciprocal] != self)
              add_reciprocal = o && o.associations[reciprocal] != self
            end
          else
            return if a && a == o
            if reciprocal
              remove_reciprocal = a
              add_reciprocal = o
            end
          end
          run_association_callbacks(opts, :before_set, o)
          remove_reciprocal_object(opts, a) if remove_reciprocal
          # Allow calling private _setter method
          send(opts[:_setter_method], o)
          associations[opts[:name]] = o
          add_reciprocal_object(opts, o) if add_reciprocal
          run_association_callbacks(opts, :after_set, o)
          o
        end

        # Whether run the associated object setter code if passed the same object as the one already
        # cached in the association.  Usually not set (so nil), can be set on a per-object basis
        # if necessary.
        def set_associated_object_if_same?
          @set_associated_object_if_same
        end
        
        # Set the given object as the associated object for the given many_to_one association reflection
        def set_associated_object(opts, o)
          raise(Error, "associated object #{o.inspect} does not have a primary key") if o && !o.pk
          _set_associated_object(opts, o)
        end

        # Set the given object as the associated object for the given one_through_one association reflection
        def set_one_through_one_associated_object(opts, o)
          raise(Error, "object #{inspect} does not have a primary key") unless pk
          raise(Error, "associated object #{o.inspect} does not have a primary key") if o && !o.pk
          _set_associated_object(opts, o)
        end

        # Set the given object as the associated object for the given one_to_one association reflection
        def set_one_to_one_associated_object(opts, o)
          raise(Error, "object #{inspect} does not have a primary key") unless pk
          _set_associated_object(opts, o)
        end
      end

      # Eager loading makes it so that you can load all associated records for a
      # set of objects in a single query, instead of a separate query for each object.
      #
      # Two separate implementations are provided.  +eager+ should be used most of the
      # time, as it loads associated records using one query per association.  However,
      # it does not allow you the ability to filter or order based on columns in associated tables.  +eager_graph+ loads
      # all records in a single query using JOINs, allowing you to filter or order based on columns in associated
      # tables.  However, +eager_graph+ is usually slower than +eager+, especially if multiple
      # one_to_many or many_to_many associations are joined.
      #
      # You can cascade the eager loading (loading associations on associated objects)
      # with no limit to the depth of the cascades.  You do this by passing a hash to +eager+ or +eager_graph+
      # with the keys being associations of the current model and values being
      # associations of the model associated with the current model via the key.
      #  
      # The arguments can be symbols or hashes with symbol keys (for cascaded
      # eager loading). Examples:
      #
      #   Album.eager(:artist).all
      #   Album.eager_graph(:artist).all
      #   Album.eager(:artist, :genre).all
      #   Album.eager_graph(:artist, :genre).all
      #   Album.eager(:artist).eager(:genre).all
      #   Album.eager_graph(:artist).eager_graph(:genre).all
      #   Artist.eager(albums: :tracks).all
      #   Artist.eager_graph(albums: :tracks).all
      #   Artist.eager(albums: {tracks: :genre}).all
      #   Artist.eager_graph(albums: {tracks: :genre}).all
      #
      # You can also pass a callback as a hash value in order to customize the dataset being
      # eager loaded at query time, analogous to the way the :eager_block association option
      # allows you to customize it at association definition time. For example,
      # if you wanted artists with their albums since 1990:
      #
      #   Artist.eager(albums: proc{|ds| ds.where{year > 1990}})
      #
      # Or if you needed albums and their artist's name only, using a single query:
      #
      #   Albums.eager_graph(artist: proc{|ds| ds.select(:name)})
      #
      # To cascade eager loading while using a callback, you substitute the cascaded
      # associations with a single entry hash that has the proc callback as the key and 
      # the cascaded associations as the value.  This will load artists with their albums
      # since 1990, and also the tracks on those albums and the genre for those tracks:
      #
      #   Artist.eager(albums: {proc{|ds| ds.where{year > 1990}}=>{tracks: :genre}})
      module DatasetMethods
        %w'inner left right full'.each do |type|
          class_eval(<<-END, __FILE__, __LINE__+1)
            def association_#{type}_join(*associations)
              _association_join(:#{type}, associations)
            end
          END
        end

        # Adds one or more INNER JOINs to the existing dataset using the keys and conditions
        # specified by the given association(s).  Take the same arguments as eager_graph, and
        # operates similarly, but only adds the joins as opposed to making the other changes
        # (such as adding selected columns and setting up eager loading).
        #
        # The following methods also exist for specifying a different type of JOIN:
        #
        # association_full_join :: FULL JOIN
        # association_inner_join :: INNER JOIN
        # association_left_join :: LEFT JOIN
        # association_right_join :: RIGHT JOIN
        #
        # Examples:
        #
        #   # For each album, association_join load the artist
        #   Album.association_join(:artist).all
        #   # SELECT *
        #   # FROM albums
        #   # INNER JOIN artists AS artist ON (artists.id = albums.artist_id)
        #
        #   # For each album, association_join load the artist, using a specified alias
        #   Album.association_join(Sequel[:artist].as(:a)).all
        #   # SELECT *
        #   # FROM albums
        #   # INNER JOIN artists AS a ON (a.id = albums.artist_id)
        #
        #   # For each album, association_join load the artist and genre
        #   Album.association_join(:artist, :genre).all
        #   Album.association_join(:artist).association_join(:genre).all
        #   # SELECT *
        #   # FROM albums
        #   # INNER JOIN artists AS artist ON (artist.id = albums.artist_id)
        #   # INNER JOIN genres AS genre ON (genre.id = albums.genre_id)
        #
        #   # For each artist, association_join load albums and tracks for each album
        #   Artist.association_join(albums: :tracks).all
        #   # SELECT *
        #   # FROM artists 
        #   # INNER JOIN albums ON (albums.artist_id = artists.id)
        #   # INNER JOIN tracks ON (tracks.album_id = albums.id)
        #
        #   # For each artist, association_join load albums, tracks for each album, and genre for each track
        #   Artist.association_join(albums: {tracks: :genre}).all
        #   # SELECT *
        #   # FROM artists 
        #   # INNER JOIN albums ON (albums.artist_id = artists.id)
        #   # INNER JOIN tracks ON (tracks.album_id = albums.id)
        #   # INNER JOIN genres AS genre ON (genre.id = tracks.genre_id)
        #
        #   # For each artist, association_join load albums with year > 1990
        #   Artist.association_join(albums: proc{|ds| ds.where{year > 1990}}).all
        #   # SELECT *
        #   # FROM artists 
        #   # INNER JOIN (
        #   #   SELECT * FROM albums WHERE (year > 1990)
        #   # ) AS albums ON (albums.artist_id = artists.id)
        #
        #   # For each artist, association_join load albums and tracks 1-10 for each album
        #   Artist.association_join(albums: {tracks: proc{|ds| ds.where(number: 1..10)}}).all
        #   # SELECT *
        #   # FROM artists 
        #   # INNER JOIN albums ON (albums.artist_id = artists.id)
        #   # INNER JOIN (
        #   #   SELECT * FROM tracks WHERE ((number >= 1) AND (number <= 10))
        #   # ) AS tracks ON (tracks.albums_id = albums.id)
        #
        #   # For each artist, association_join load albums with year > 1990, and tracks for those albums
        #   Artist.association_join(albums: {proc{|ds| ds.where{year > 1990}}=>:tracks}).all
        #   # SELECT *
        #   # FROM artists 
        #   # INNER JOIN (
        #   #   SELECT * FROM albums WHERE (year > 1990)
        #   # ) AS albums ON (albums.artist_id = artists.id)
        #   # INNER JOIN tracks ON (tracks.album_id = albums.id)
        def association_join(*associations)
          association_inner_join(*associations)
        end
      
        # If the expression is in the form <tt>x = y</tt> where +y+ is a <tt>Sequel::Model</tt>
        # instance, array of <tt>Sequel::Model</tt> instances, or a <tt>Sequel::Model</tt> dataset,
        # assume +x+ is an association symbol and look up the association reflection
        # via the dataset's model.  From there, return the appropriate SQL based on the type of
        # association and the values of the foreign/primary keys of +y+.  For most association
        # types, this is a simple transformation, but for +many_to_many+ associations this 
        # creates a subquery to the join table.
        def complex_expression_sql_append(sql, op, args)
          r = args[1]
          if (((op == :'=' || op == :'!=') && r.is_a?(Sequel::Model)) ||
              (multiple = ((op == :IN || op == :'NOT IN') && ((is_ds = r.is_a?(Sequel::Dataset)) || (r.respond_to?(:all?) && r.all?{|x| x.is_a?(Sequel::Model)})))))
            l = args[0]
            if ar = model.association_reflections[l]
              if multiple
                klass = ar.associated_class
                if is_ds
                  if r.respond_to?(:model)
                    unless r.model <= klass
                      # A dataset for a different model class, could be a valid regular query
                      return super
                    end
                  else
                    # Not a model dataset, could be a valid regular query
                    return super
                  end
                else
                  unless r.all?{|x| x.is_a?(klass)}
                    raise Sequel::Error, "invalid association class for one object for association #{l.inspect} used in dataset filter for model #{model.inspect}, expected class #{klass.inspect}"
                  end
                end
              elsif !r.is_a?(ar.associated_class)
                raise Sequel::Error, "invalid association class #{r.class.inspect} for association #{l.inspect} used in dataset filter for model #{model.inspect}, expected class #{ar.associated_class.inspect}"
              end

              if exp = association_filter_expression(op, ar, r)
                literal_append(sql, exp)
              else
                raise Sequel::Error, "invalid association type #{ar[:type].inspect} for association #{l.inspect} used in dataset filter for model #{model.inspect}"
              end
            elsif multiple && (is_ds || r.empty?)
              # Not a query designed for this support, could be a valid regular query
              super
            else
              raise Sequel::Error, "invalid association #{l.inspect} used in dataset filter for model #{model.inspect}"
            end
          else
            super
          end
        end

        # The preferred eager loading method.  Loads all associated records using one
        # query for each association.
        #
        # The basic idea for how it works is that the dataset is first loaded normally.
        # Then it goes through all associations that have been specified via +eager+.
        # It loads each of those associations separately, then associates them back
        # to the original dataset via primary/foreign keys.  Due to the necessity of
        # all objects being present, you need to use +all+ to use eager loading, as it
        # can't work with +each+.
        #
        # This implementation avoids the complexity of extracting an object graph out
        # of a single dataset, by building the object graph out of multiple datasets,
        # one for each association.  By using a separate dataset for each association,
        # it avoids problems such as aliasing conflicts and creating cartesian product
        # result sets if multiple one_to_many or many_to_many eager associations are requested.
        #
        # One limitation of using this method is that you cannot filter the current dataset
        # based on values of columns in an associated table, since the associations are loaded
        # in separate queries.  To do that you need to load all associations in the
        # same query, and extract an object graph from the results of that query. If you
        # need to filter based on columns in associated tables, look at +eager_graph+
        # or join the tables you need to filter on manually. 
        #
        # Each association's order, if defined, is respected.
        # If the association uses a block or has an :eager_block argument, it is used.
        #
        # To modify the associated dataset that will be used for the eager load, you should use a
        # hash for the association, with the key being the association name symbol, and the value being
        # a callable object that is called with the associated dataset and should return a modified
        # dataset.  If that association also has dependent associations, instead of a callable object,
        # use a hash with the callable object being the key, and the dependent association(s) as the value.
        #
        # Examples:
        #
        #   # For each album, eager load the artist
        #   Album.eager(:artist).all
        #   # SELECT * FROM albums
        #   # SELECT * FROM artists WHERE (id IN (...))
        #
        #   # For each album, eager load the artist and genre
        #   Album.eager(:artist, :genre).all
        #   Album.eager(:artist).eager(:genre).all
        #   # SELECT * FROM albums
        #   # SELECT * FROM artists WHERE (id IN (...))
        #   # SELECT * FROM genres WHERE (id IN (...))
        #
        #   # For each artist, eager load albums and tracks for each album
        #   Artist.eager(albums: :tracks).all
        #   # SELECT * FROM artists
        #   # SELECT * FROM albums WHERE (artist_id IN (...))
        #   # SELECT * FROM tracks WHERE (album_id IN (...))
        #
        #   # For each artist, eager load albums, tracks for each album, and genre for each track
        #   Artist.eager(albums: {tracks: :genre}).all
        #   # SELECT * FROM artists
        #   # SELECT * FROM albums WHERE (artist_id IN (...))
        #   # SELECT * FROM tracks WHERE (album_id IN (...))
        #   # SELECT * FROM genre WHERE (id IN (...))
        #
        #   # For each artist, eager load albums with year > 1990
        #   Artist.eager(albums: proc{|ds| ds.where{year > 1990}}).all
        #   # SELECT * FROM artists
        #   # SELECT * FROM albums WHERE ((year > 1990) AND (artist_id IN (...)))
        #
        #   # For each artist, eager load albums and tracks 1-10 for each album
        #   Artist.eager(albums: {tracks: proc{|ds| ds.where(number: 1..10)}}).all
        #   # SELECT * FROM artists
        #   # SELECT * FROM albums WHERE (artist_id IN (...))
        #   # SELECT * FROM tracks WHERE ((number >= 1) AND (number <= 10) AND (album_id IN (...)))
        #
        #   # For each artist, eager load albums with year > 1990, and tracks for those albums
        #   Artist.eager(albums: {proc{|ds| ds.where{year > 1990}}=>:tracks}).all
        #   # SELECT * FROM artists
        #   # SELECT * FROM albums WHERE ((year > 1990) AND (artist_id IN (...)))
        #   # SELECT * FROM albums WHERE (artist_id IN (...))
        def eager(*associations)
          opts = @opts[:eager]
          association_opts = eager_options_for_associations(associations)
          opts = opts ? opts.merge(association_opts) : association_opts
          clone(:eager=>opts.freeze)
        end

        # The secondary eager loading method.  Loads all associations in a single query. This
        # method should only be used if you need to filter or order based on columns in associated tables,
        # or if you have done comparative benchmarking it and determined it is faster.
        #
        # This method uses <tt>Dataset#graph</tt> to create appropriate aliases for columns in all the
        # tables.  Then it uses the graph's metadata to build the associations from the single hash, and
        # finally replaces the array of hashes with an array model objects inside all.
        #
        # Be very careful when using this with multiple one_to_many or many_to_many associations, as you can
        # create large cartesian products.  If you must graph multiple one_to_many and many_to_many associations,
        # make sure your filters are narrow if the datasets are large.
        # 
        # Each association's order, if defined, is respected. +eager_graph+ probably
        # won't work correctly on a limited dataset, unless you are
        # only graphing many_to_one, one_to_one, and one_through_one associations.
        # 
        # Does not use the block defined for the association, since it does a single query for
        # all objects.  You can use the :graph_* association options to modify the SQL query.
        #
        # Like +eager+, you need to call +all+ on the dataset for the eager loading to work.  If you just
        # call +each+, it will yield plain hashes, each containing all columns from all the tables.
        #
        # To modify the associated dataset that will be joined to the current dataset, you should use a
        # hash for the association, with the key being the association name symbol, and the value being
        # a callable object that is called with the associated dataset and should return a modified
        # dataset.  If that association also has dependent associations, instead of a callable object,
        # use a hash with the callable object being the key, and the dependent association(s) as the value.
        # 
        # You can specify an alias by providing a Sequel::SQL::AliasedExpression object instead of
        # an a Symbol for the assocation name.
        #
        # Examples:
        #
        #   # For each album, eager_graph load the artist
        #   Album.eager_graph(:artist).all
        #   # SELECT ...
        #   # FROM albums
        #   # LEFT OUTER JOIN artists AS artist ON (artists.id = albums.artist_id)
        #
        #   # For each album, eager_graph load the artist, using a specified alias
        #   Album.eager_graph(Sequel[:artist].as(:a)).all
        #   # SELECT ...
        #   # FROM albums
        #   # LEFT OUTER JOIN artists AS a ON (a.id = albums.artist_id)
        #
        #   # For each album, eager_graph load the artist and genre
        #   Album.eager_graph(:artist, :genre).all
        #   Album.eager_graph(:artist).eager_graph(:genre).all
        #   # SELECT ...
        #   # FROM albums
        #   # LEFT OUTER JOIN artists AS artist ON (artist.id = albums.artist_id)
        #   # LEFT OUTER JOIN genres AS genre ON (genre.id = albums.genre_id)
        #
        #   # For each artist, eager_graph load albums and tracks for each album
        #   Artist.eager_graph(albums: :tracks).all
        #   # SELECT ...
        #   # FROM artists 
        #   # LEFT OUTER JOIN albums ON (albums.artist_id = artists.id)
        #   # LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)
        #
        #   # For each artist, eager_graph load albums, tracks for each album, and genre for each track
        #   Artist.eager_graph(albums: {tracks: :genre}).all
        #   # SELECT ...
        #   # FROM artists 
        #   # LEFT OUTER JOIN albums ON (albums.artist_id = artists.id)
        #   # LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)
        #   # LEFT OUTER JOIN genres AS genre ON (genre.id = tracks.genre_id)
        #
        #   # For each artist, eager_graph load albums with year > 1990
        #   Artist.eager_graph(albums: proc{|ds| ds.where{year > 1990}}).all
        #   # SELECT ...
        #   # FROM artists 
        #   # LEFT OUTER JOIN (
        #   #   SELECT * FROM albums WHERE (year > 1990)
        #   # ) AS albums ON (albums.artist_id = artists.id)
        #
        #   # For each artist, eager_graph load albums and tracks 1-10 for each album
        #   Artist.eager_graph(albums: {tracks: proc{|ds| ds.where(number: 1..10)}}).all
        #   # SELECT ...
        #   # FROM artists 
        #   # LEFT OUTER JOIN albums ON (albums.artist_id = artists.id)
        #   # LEFT OUTER JOIN (
        #   #   SELECT * FROM tracks WHERE ((number >= 1) AND (number <= 10))
        #   # ) AS tracks ON (tracks.albums_id = albums.id)
        #
        #   # For each artist, eager_graph load albums with year > 1990, and tracks for those albums
        #   Artist.eager_graph(albums: {proc{|ds| ds.where{year > 1990}}=>:tracks}).all
        #   # SELECT ...
        #   # FROM artists 
        #   # LEFT OUTER JOIN (
        #   #   SELECT * FROM albums WHERE (year > 1990)
        #   # ) AS albums ON (albums.artist_id = artists.id)
        #   # LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)
        def eager_graph(*associations)
          eager_graph_with_options(associations)
        end

        # Run eager_graph with some options specific to just this call. Unlike eager_graph, this takes
        # the associations as a single argument instead of multiple arguments.
        #
        # Options:
        #
        # :join_type :: Override the join type specified in the association
        # :limit_strategy :: Use a strategy for handling limits on associations.
        #                    Appropriate :limit_strategy values are:
        #                    true :: Pick the most appropriate based on what the database supports
        #                    :distinct_on :: Force use of DISTINCT ON stategy (*_one associations only)
        #                    :correlated_subquery :: Force use of correlated subquery strategy (one_to_* associations only)
        #                    :window_function :: Force use of window function strategy
        #                    :ruby :: Don't modify the SQL, implement limits/offsets with array slicing
        #
        #                    This can also be a hash with association name symbol keys and one of the above values,
        #                    to use different strategies per association.
        #
        #                    The default is the :ruby strategy.  Choosing a different strategy can make your code
        #                    significantly slower in some cases (perhaps even the majority of cases), so you should
        #                    only use this if you have benchmarked that it is faster for your use cases.
        def eager_graph_with_options(associations, opts=OPTS)
          opts = opts.dup unless opts.frozen?
          associations = [associations] unless associations.is_a?(Array)
          ds = if eg = @opts[:eager_graph]
            eg = eg.dup
            [:requirements, :reflections, :reciprocals, :limits].each{|k| eg[k] = eg[k].dup}
            eg[:local] = opts
            ds = clone(:eager_graph=>eg)
            ds.eager_graph_associations(ds, model, ds.opts[:eager_graph][:master], [], *associations)
          else
            # Each of the following have a symbol key for the table alias, with the following values: 
            # :reciprocals :: the reciprocal value to use for this association
            # :reflections :: AssociationReflection instance related to this association
            # :requirements :: array of requirements for this association
            # :limits :: Any limit/offset array slicing that need to be handled in ruby land after loading
            opts = {:requirements=>{}, :master=>alias_symbol(first_source), :reflections=>{}, :reciprocals=>{}, :limits=>{}, :local=>opts, :cartesian_product_number=>0, :row_proc=>row_proc}
            ds = clone(:eager_graph=>opts)
            ds = ds.eager_graph_associations(ds, model, ds.opts[:eager_graph][:master], [], *associations).naked
          end

          ds.opts[:eager_graph].freeze
          ds.opts[:eager_graph].each_value{|v| v.freeze if v.is_a?(Hash)}
          ds
        end

        # If the dataset is being eagerly loaded, default to calling all
        # instead of each.
        def as_hash(key_column=nil, value_column=nil, opts=OPTS)
          if (@opts[:eager_graph] || @opts[:eager]) && !opts.has_key?(:all)
            opts = Hash[opts]
            opts[:all] = true
          end
          super
        end

        # If the dataset is being eagerly loaded, default to calling all
        # instead of each.
        def to_hash_groups(key_column, value_column=nil, opts=OPTS)
          if (@opts[:eager_graph] || @opts[:eager]) && !opts.has_key?(:all)
            opts = Hash[opts]
            opts[:all] = true
          end
          super
        end

        # Do not attempt to split the result set into associations,
        # just return results as simple objects.  This is useful if you
        # want to use eager_graph as a shortcut to have all of the joins
        # and aliasing set up, but want to do something else with the dataset.
        def ungraphed
          ds = super.clone(:eager_graph=>nil)
          if (eg = @opts[:eager_graph]) && (rp = eg[:row_proc])
            ds = ds.with_row_proc(rp)
          end
          ds
        end
      
        protected
      
        # Call graph on the association with the correct arguments,
        # update the eager_graph data structure, and recurse into
        # eager_graph_associations if there are any passed in associations
        # (which would be dependencies of the current association)
        #
        # Arguments:
        # ds :: Current dataset
        # model :: Current Model
        # ta :: table_alias used for the parent association
        # requirements :: an array, used as a stack for requirements
        # r :: association reflection for the current association, or an SQL::AliasedExpression
        #      with the reflection as the expression and the alias base as the aliaz.
        # *associations :: any associations dependent on this one
        def eager_graph_association(ds, model, ta, requirements, r, *associations)
          if r.is_a?(SQL::AliasedExpression)
            alias_base = r.alias
            r = r.expression
          else
            alias_base = r[:graph_alias_base]
          end
          assoc_table_alias = ds.unused_table_alias(alias_base)
          loader = r[:eager_grapher]
          if !associations.empty?
            if associations.first.respond_to?(:call)
              callback = associations.first
              associations = {}
            elsif associations.length == 1 && (assocs = associations.first).is_a?(Hash) && assocs.length == 1 && (pr_assoc = assocs.to_a.first) && pr_assoc.first.respond_to?(:call)
              callback, assoc = pr_assoc
              associations = assoc.is_a?(Array) ? assoc : [assoc]
            end
          end
          local_opts = ds.opts[:eager_graph][:local]
          limit_strategy = r.eager_graph_limit_strategy(local_opts[:limit_strategy])

          if r[:conditions] && !Sequel.condition_specifier?(r[:conditions]) && !r[:orig_opts].has_key?(:graph_conditions) && !r[:orig_opts].has_key?(:graph_only_conditions) && !r.has_key?(:graph_block)
            raise Error, "Cannot eager_graph association when :conditions specified and not a hash or an array of pairs.  Specify :graph_conditions, :graph_only_conditions, or :graph_block for the association.  Model: #{r[:model]}, association: #{r[:name]}"
          end

          ds = loader.call(:self=>ds, :table_alias=>assoc_table_alias, :implicit_qualifier=>(ta == ds.opts[:eager_graph][:master]) ? first_source : qualifier_from_alias_symbol(ta, first_source), :callback=>callback, :join_type=>local_opts[:join_type], :join_only=>local_opts[:join_only], :limit_strategy=>limit_strategy, :from_self_alias=>ds.opts[:eager_graph][:master])
          if r[:order_eager_graph] && (order = r.fetch(:graph_order, r[:order]))
            ds = ds.order_append(*qualified_expression(order, assoc_table_alias))
          end
          eager_graph = ds.opts[:eager_graph]
          eager_graph[:requirements][assoc_table_alias] = requirements.dup
          eager_graph[:reflections][assoc_table_alias] = r
          if limit_strategy == :ruby
            eager_graph[:limits][assoc_table_alias] = r.limit_and_offset 
          end
          eager_graph[:cartesian_product_number] += r[:cartesian_product_number] || 2
          ds = ds.eager_graph_associations(ds, r.associated_class, assoc_table_alias, requirements + [assoc_table_alias], *associations) unless associations.empty?
          ds
        end

        # Check the associations are valid for the given model.
        # Call eager_graph_association on each association.
        #
        # Arguments:
        # ds :: Current dataset
        # model :: Current Model
        # ta :: table_alias used for the parent association
        # requirements :: an array, used as a stack for requirements
        # *associations :: the associations to add to the graph
        def eager_graph_associations(ds, model, ta, requirements, *associations)
          return ds if associations.empty?
          associations.flatten.each do |association|
            ds = case association
            when Symbol, SQL::AliasedExpression
              ds.eager_graph_association(ds, model, ta, requirements, eager_graph_check_association(model, association))
            when Hash
              association.each do |assoc, assoc_assocs|
                ds = ds.eager_graph_association(ds, model, ta, requirements, eager_graph_check_association(model, assoc), assoc_assocs)
              end
              ds
            else
              raise(Sequel::Error, 'Associations must be in the form of a symbol or hash')
            end
          end
          ds
        end

        # Replace the array of plain hashes with an array of model objects will all eager_graphed
        # associations set in the associations cache for each object.
        def eager_graph_build_associations(hashes)
          hashes.replace(_eager_graph_build_associations(hashes, eager_graph_loader))
        end
      
        private

        # Return a new dataset with JOINs of the given type added, using the tables and
        # conditions specified by the associations.
        def _association_join(type, associations)
          clone(:join=>clone(:graph_from_self=>false).eager_graph_with_options(associations, :join_type=>type, :join_only=>true).opts[:join])
        end

        # Process the array of hashes using the eager graph loader to return an array
        # of model objects with the associations set.
        def _eager_graph_build_associations(hashes, egl)
          egl.load(hashes)
        end

        # If the association has conditions itself, then it requires additional filters be
        # added to the current dataset to ensure that the passed in object would also be
        # included by the association's conditions.
        def add_association_filter_conditions(ref, obj, expr)
          if expr != SQL::Constants::FALSE && ref.filter_by_associations_add_conditions?
            Sequel[ref.filter_by_associations_conditions_expression(obj)]
          else
            expr
          end
        end

        # Process the array of associations arguments (Symbols, Arrays, and Hashes),
        # and return a hash of options suitable for cascading.
        def eager_options_for_associations(associations)
          opts = {}
          associations.flatten.each do |association|
            case association
            when Symbol
              check_association(model, association)
              opts[association] = nil
            when Hash
              association.keys.each{|assoc| check_association(model, assoc)}
              opts.merge!(association)
            else
              raise(Sequel::Error, 'Associations must be in the form of a symbol or hash')
            end
          end
          opts
        end
      
        # Return an expression for filtering by the given association reflection and associated object.
        def association_filter_expression(op, ref, obj)
          meth = :"#{ref[:type]}_association_filter_expression"
          # Allow calling private association specific method to get filter expression
          send(meth, op, ref, obj) if respond_to?(meth, true)
        end

        # Handle inversion for association filters by returning an inverted expression,
        # plus also handling cases where the referenced columns are NULL.
        def association_filter_handle_inversion(op, exp, cols)
          if op == :'!=' || op == :'NOT IN'
            if exp == SQL::Constants::FALSE
              ~exp
            else
              ~exp | Sequel::SQL::BooleanExpression.from_value_pairs(cols.zip([]), :OR)
            end
          else
            exp
          end
        end

        # Return an expression for making sure that the given keys match the value of
        # the given methods for either the single object given or for any of the objects
        # given if +obj+ is an array.
        def association_filter_key_expression(keys, meths, obj)
          vals = if obj.is_a?(Sequel::Dataset)
            {(keys.length == 1 ? keys.first : keys)=>obj.select(*meths).exclude(Sequel::SQL::BooleanExpression.from_value_pairs(meths.zip([]), :OR))}
          else
            vals = Array(obj).reject{|o| !meths.all?{|m| o.get_column_value(m)}}
            return SQL::Constants::FALSE if vals.empty?
            if obj.is_a?(Array)
              if keys.length == 1
                meth = meths.first
                {keys.first=>vals.map{|o| o.get_column_value(meth)}}
              else
                {keys=>vals.map{|o| meths.map{|m| o.get_column_value(m)}}}
              end  
            else
              keys.zip(meths.map{|k| obj.get_column_value(k)})
            end
          end
          SQL::BooleanExpression.from_value_pairs(vals)
        end

        # Make sure the association is valid for this model, and return the related AssociationReflection.
        def check_association(model, association)
          raise(Sequel::UndefinedAssociation, "Invalid association #{association} for #{model.name}") unless reflection = model.association_reflection(association)
          raise(Sequel::Error, "Eager loading is not allowed for #{model.name} association #{association}") if reflection[:allow_eager] == false
          reflection
        end
      
        # Allow associations that are eagerly graphed to be specified as an SQL::AliasedExpression, for
        # per-call determining of the alias base.
        def eager_graph_check_association(model, association)
          if association.is_a?(SQL::AliasedExpression)
            expr = association.expression
            if expr.is_a?(SQL::Identifier)
              expr = expr.value
              if expr.is_a?(String)
                expr = expr.to_sym
              end
            end

            SQL::AliasedExpression.new(check_association(model, expr), association.alias)
          else
            check_association(model, association)
          end
        end
      
        # The EagerGraphLoader instance used for converting eager_graph results.
        def eager_graph_loader
          unless egl = cache_get(:_model_eager_graph_loader)
            egl = cache_set(:_model_eager_graph_loader, EagerGraphLoader.new(self))
          end
          egl.dup
        end

        # Eagerly load all specified associations 
        def eager_load(a, eager_assoc=@opts[:eager])
          return if a.empty?
          # Key is foreign/primary key name symbol.
          # Value is hash with keys being foreign/primary key values (generally integers)
          # and values being an array of current model objects with that specific foreign/primary key
          key_hash = {}
          # Reflections for all associations to eager load
          reflections = eager_assoc.keys.map{|assoc| model.association_reflection(assoc) || (raise Sequel::UndefinedAssociation, "Model: #{self}, Association: #{assoc}")}
      
          # Populate the key_hash entry for each association being eagerly loaded
          reflections.each do |r|
            if key = r.eager_loader_key
              # key_hash for this key has already been populated,
              # skip populating again so that duplicate values
              # aren't added.
              unless id_map = key_hash[key]
                id_map = key_hash[key] = Hash.new{|h,k| h[k] = []}

                # Supporting both single (Symbol) and composite (Array) keys.
                a.each do |rec|
                  case key
                  when Array
                    if (k = key.map{|k2| rec.get_column_value(k2)}) && k.all?
                      id_map[k] << rec
                    end
                  when Symbol
                    if k = rec.get_column_value(key)
                      id_map[k] << rec
                    end
                  else
                    raise Error, "unhandled eager_loader_key #{key.inspect} for association #{r[:name]}"
                  end
                end
              end
            else
              id_map = nil
            end
          
            loader = r[:eager_loader]
            associations = eager_assoc[r[:name]]
            if associations.respond_to?(:call)
              eager_block = associations
              associations = OPTS
            elsif associations.is_a?(Hash) && associations.length == 1 && (pr_assoc = associations.to_a.first) && pr_assoc.first.respond_to?(:call)
              eager_block, associations = pr_assoc
            end
            loader.call(:key_hash=>key_hash, :rows=>a, :associations=>associations, :self=>self, :eager_block=>eager_block, :id_map=>id_map)
            a.each{|object| object.send(:run_association_callbacks, r, :after_load, object.associations[r[:name]])} if r[:after_load]
          end 
        end

        # Return a subquery expression for filering by a many_to_many association
        def many_to_many_association_filter_expression(op, ref, obj)
          lpks, lks, rks = ref.values_at(:left_primary_key_columns, :left_keys, :right_keys)
          jt = ref.join_table_alias
          lpks = lpks.first if lpks.length == 1
          lpks = ref.qualify(model.table_name, lpks)

          meths = if obj.is_a?(Sequel::Dataset)
            ref.qualify(obj.model.table_name, ref.right_primary_keys)
          else
            ref.right_primary_key_methods
          end

          expr = association_filter_key_expression(ref.qualify(jt, rks), meths, obj)
          unless expr == SQL::Constants::FALSE
            expr = SQL::BooleanExpression.from_value_pairs(lpks=>model.db.from(ref[:join_table]).select(*ref.qualify(jt, lks)).where(expr).exclude(SQL::BooleanExpression.from_value_pairs(ref.qualify(jt, lks).zip([]), :OR)))
            expr = add_association_filter_conditions(ref, obj, expr)
          end

          association_filter_handle_inversion(op, expr, Array(lpks))
        end
        alias one_through_one_association_filter_expression many_to_many_association_filter_expression

        # Return a simple equality expression for filering by a many_to_one association
        def many_to_one_association_filter_expression(op, ref, obj)
          keys = ref.qualify(model.table_name, ref[:key_columns])
          meths = if obj.is_a?(Sequel::Dataset)
            ref.qualify(obj.model.table_name, ref.primary_keys)
          else
            ref.primary_key_methods
          end

          expr = association_filter_key_expression(keys, meths, obj)
          expr = add_association_filter_conditions(ref, obj, expr)
          association_filter_handle_inversion(op, expr, keys)
        end

        # Return a simple equality expression for filering by a one_to_* association
        def one_to_many_association_filter_expression(op, ref, obj)
          keys = ref.qualify(model.table_name, ref[:primary_key_columns])
          meths = if obj.is_a?(Sequel::Dataset)
            ref.qualify(obj.model.table_name, ref[:keys])
          else
            ref[:key_methods]
          end

          expr = association_filter_key_expression(keys, meths, obj)
          expr = add_association_filter_conditions(ref, obj, expr)
          association_filter_handle_inversion(op, expr, keys)
        end
        alias one_to_one_association_filter_expression one_to_many_association_filter_expression

        def non_sql_option?(key)
          super || key == :eager || key == :eager_graph
        end

        # Build associations from the graph if #eager_graph was used, 
        # and/or load other associations if #eager was used.
        def post_load(all_records)
          eager_graph_build_associations(all_records) if @opts[:eager_graph]
          eager_load(all_records) if @opts[:eager] && (row_proc || @opts[:eager_graph])
          super
        end
      end

      # This class is the internal implementation of eager_graph.  It is responsible for taking an array of plain
      # hashes and returning an array of model objects with all eager_graphed associations already set in the
      # association cache.
      class EagerGraphLoader
        # Hash with table alias symbol keys and after_load hook values
        attr_reader :after_load_map
        
        # Hash with table alias symbol keys and association name values
        attr_reader :alias_map
        
        # Hash with table alias symbol keys and subhash values mapping column_alias symbols to the
        # symbol of the real name of the column
        attr_reader :column_maps
        
        # Recursive hash with table alias symbol keys mapping to hashes with dependent table alias symbol keys.
        attr_reader :dependency_map
        
        # Hash with table alias symbol keys and [limit, offset] values
        attr_reader :limit_map
        
        # The table alias symbol for the primary model
        attr_reader :master
        
        # Hash with table alias symbol keys and primary key symbol values (or arrays of primary key symbols for
        # composite key tables)
        attr_reader :primary_keys

        # Hash with table alias symbol keys and reciprocal association symbol values,
        # used for setting reciprocals for one_to_many associations.
        attr_reader :reciprocal_map
        
        # Hash with table alias symbol keys and subhash values mapping primary key symbols (or array of symbols)
        # to model instances.  Used so that only a single model instance is created for each object.
        attr_reader :records_map
        
        # Hash with table alias symbol keys and AssociationReflection values
        attr_reader :reflection_map
        
        # Hash with table alias symbol keys and callable values used to create model instances
        attr_reader :row_procs
        
        # Hash with table alias symbol keys and true/false values, where true means the
        # association represented by the table alias uses an array of values instead of
        # a single value (i.e. true => *_many, false => *_to_one).
        attr_reader :type_map

        # Initialize all of the data structures used during loading.
        def initialize(dataset)
          opts = dataset.opts
          eager_graph = opts[:eager_graph]
          @master =  eager_graph[:master]
          requirements = eager_graph[:requirements]
          reflection_map = @reflection_map = eager_graph[:reflections]
          reciprocal_map = @reciprocal_map = eager_graph[:reciprocals]
          limit_map = @limit_map = eager_graph[:limits]
          @unique = eager_graph[:cartesian_product_number] > 1
      
          alias_map = @alias_map = {}
          type_map = @type_map = {}
          after_load_map = @after_load_map = {}
          reflection_map.each do |k, v|
            alias_map[k] = v[:name]
            after_load_map[k] = v[:after_load] if v[:after_load]
            type_map[k] = if v.returns_array?
              true
            elsif (limit_and_offset = limit_map[k]) && !limit_and_offset.last.nil?
              :offset
            end
          end
          after_load_map.freeze
          alias_map.freeze
          type_map.freeze

          # Make dependency map hash out of requirements array for each association.
          # This builds a tree of dependencies that will be used for recursion
          # to ensure that all parts of the object graph are loaded into the
          # appropriate subordinate association.
          dependency_map = @dependency_map = {}
          # Sort the associations by requirements length, so that
          # requirements are added to the dependency hash before their
          # dependencies.
          requirements.sort_by{|a| a[1].length}.each do |ta, deps|
            if deps.empty?
              dependency_map[ta] = {}
            else
              deps = deps.dup
              hash = dependency_map[deps.shift]
              deps.each do |dep|
                hash = hash[dep]
              end
              hash[ta] = {}
            end
          end
          freezer = lambda do |h|
            h.freeze
            h.each_value(&freezer)
          end
          freezer.call(dependency_map)
      
          datasets = opts[:graph][:table_aliases].to_a.reject{|ta,ds| ds.nil?}
          column_aliases = opts[:graph][:column_aliases]
          primary_keys = {}
          column_maps = {}
          models = {}
          row_procs = {}
          datasets.each do |ta, ds|
            models[ta] = ds.model
            primary_keys[ta] = []
            column_maps[ta] = {}
            row_procs[ta] = ds.row_proc
          end
          column_aliases.each do |col_alias, tc|
            ta, column = tc
            column_maps[ta][col_alias] = column
          end
          column_maps.each do |ta, h|
            pk = models[ta].primary_key
            if pk.is_a?(Array)
              primary_keys[ta] = []
              h.select{|ca, c| primary_keys[ta] << ca if pk.include?(c)}
            else
              h.select{|ca, c| primary_keys[ta] = ca if pk == c}
            end
          end
          @column_maps = column_maps.freeze
          @primary_keys = primary_keys.freeze
          @row_procs = row_procs.freeze

          # For performance, create two special maps for the master table,
          # so you can skip a hash lookup.
          @master_column_map = column_maps[master]
          @master_primary_keys = primary_keys[master]

          # Add a special hash mapping table alias symbols to 5 element arrays that just
          # contain the data in other data structures for that table alias.  This is
          # used for performance, to get all values in one hash lookup instead of
          # separate hash lookups for each data structure.
          ta_map = {}
          alias_map.each_key do |ta|
            ta_map[ta] = [row_procs[ta], alias_map[ta], type_map[ta], reciprocal_map[ta]].freeze
          end
          @ta_map = ta_map.freeze
          freeze
        end

        # Return an array of primary model instances with the associations cache prepopulated
        # for all model objects (both primary and associated).
        def load(hashes)
          # This mapping is used to make sure that duplicate entries in the
          # result set are mapped to a single record.  For example, using a
          # single one_to_many association with 10 associated records,
          # the main object column values appear in the object graph 10 times.
          # We map by primary key, if available, or by the object's entire values,
          # if not. The mapping must be per table, so create sub maps for each table
          # alias.
          @records_map = records_map = {}
          alias_map.keys.each{|ta| records_map[ta] = {}}

          master = master()
      
          # Assign to local variables for speed increase
          rp = row_procs[master]
          rm = records_map[master] = {}
          dm = dependency_map

          records_map.freeze

          # This will hold the final record set that we will be replacing the object graph with.
          records = []

          hashes.each do |h|
            unless key = master_pk(h)
              key = hkey(master_hfor(h))
            end
            unless primary_record = rm[key]
              primary_record = rm[key] = rp.call(master_hfor(h))
              # Only add it to the list of records to return if it is a new record
              records.push(primary_record)
            end
            # Build all associations for the current object and it's dependencies
            _load(dm, primary_record, h)
          end
      
          # Remove duplicate records from all associations if this graph could possibly be a cartesian product
          # Run after_load procs if there are any
          post_process(records, dm) if @unique || !after_load_map.empty? || !limit_map.empty?

          records_map.each_value(&:freeze)
          freeze

          records
        end
      
        private

        # Recursive method that creates associated model objects and associates them to the current model object.
        def _load(dependency_map, current, h)
          dependency_map.each do |ta, deps|
            unless key = pk(ta, h)
              ta_h = hfor(ta, h)
              unless ta_h.values.any?
                assoc_name = alias_map[ta]
                unless (assoc = current.associations).has_key?(assoc_name)
                  assoc[assoc_name] = type_map[ta] ? [] : nil
                end
                next
              end
              key = hkey(ta_h)
            end
            rp, assoc_name, tm, rcm = @ta_map[ta]
            rm = records_map[ta]

            # Check type map for all dependencies, and use a unique
            # object if any are dependencies for multiple objects,
            # to prevent duplicate objects from showing up in the case
            # the normal duplicate removal code is not being used.
            if !@unique && !deps.empty? && deps.any?{|dep_key,_| @ta_map[dep_key][2]}
              key = [current.object_id, key]
            end

            unless rec = rm[key]
              rec = rm[key] = rp.call(hfor(ta, h))
            end

            if tm
              unless (assoc = current.associations).has_key?(assoc_name)
                assoc[assoc_name] = []
              end
              assoc[assoc_name].push(rec) 
              rec.associations[rcm] = current if rcm
            else
              current.associations[assoc_name] ||= rec
            end
            # Recurse into dependencies of the current object
            _load(deps, rec, h) unless deps.empty?
          end
        end
      
        # Return the subhash for the specific table alias +ta+ by parsing the values out of the main hash +h+
        def hfor(ta, h)
          out = {}
          @column_maps[ta].each{|ca, c| out[c] = h[ca]}
          out
        end

        # Return a suitable hash key for any subhash +h+, which is an array of values by column order.
        # This is only used if the primary key cannot be used.
        def hkey(h)
          h.sort_by{|x| x[0]}
        end

        # Return the subhash for the master table by parsing the values out of the main hash +h+
        def master_hfor(h)
          out = {}
          @master_column_map.each{|ca, c| out[c] = h[ca]}
          out
        end

        # Return a primary key value for the master table by parsing it out of the main hash +h+.
        def master_pk(h)
          x = @master_primary_keys
          if x.is_a?(Array)
            unless x == []
              x = x.map{|ca| h[ca]}
              x if x.all?
            end
          else
            h[x]
          end
        end

        # Return a primary key value for the given table alias by parsing it out of the main hash +h+.
        def pk(ta, h)
          x = primary_keys[ta]
          if x.is_a?(Array)
            unless x == []
              x = x.map{|ca| h[ca]}
              x if x.all?
            end
          else
            h[x]
          end
        end

        # If the result set is the result of a cartesian product, then it is possible that
        # there are multiple records for each association when there should only be one.
        # In that case, for each object in all associations loaded via +eager_graph+, run
        # uniq! on the association to make sure no duplicate records show up.
        # Note that this can cause legitimate duplicate records to be removed.
        def post_process(records, dependency_map)
          records.each do |record|
            dependency_map.each do |ta, deps|
              assoc_name = alias_map[ta]
              list = record.public_send(assoc_name)
              rec_list = if type_map[ta]
                list.uniq!
                if lo = limit_map[ta]
                  limit, offset = lo
                  offset ||= 0
                  if type_map[ta] == :offset
                    [record.associations[assoc_name] = list[offset]]
                  else
                    list.replace(list[(offset)..(limit ? (offset)+limit-1 : -1)] || [])
                  end
                else
                  list
                end
              elsif list
                [list]
              else
                []
              end
              record.send(:run_association_callbacks, reflection_map[ta], :after_load, list) if after_load_map[ta]
              post_process(rec_list, deps) if !rec_list.empty? && !deps.empty?
            end
          end
        end
      end
    end
  end
end
