# frozen-string-literal: true

module Sequel
  module Plugins
    # The lazy_attributes plugin allows users to easily set that some attributes
    # should not be loaded by default when loading model objects.  If the attribute
    # is needed after the instance has been retrieved, a database query is made to
    # retreive the value of the attribute.
    #
    # This plugin depends on the tactical_eager_loading plugin, and allows you to
    # eagerly load lazy attributes for all objects retrieved with the current object.
    # So the following code should issue one query to get the albums and one query to
    # get the reviews for all of those albums:
    #
    #   Album.plugin :lazy_attributes, :review
    #   Album.where{id < 100}.all do |a|
    #     a.review
    #   end
    #
    #   # You can specify multiple columns to lazily load:
    #   Album.plugin :lazy_attributes, :review, :tracklist
    #
    # Note that by default on databases that supporting RETURNING,
    # using explicit column selections will cause instance creations
    # to use two queries (insert and refresh) instead of a single
    # query using RETURNING.  You can use the insert_returning_select
    # plugin to automatically use RETURNING for instance creations
    # for models using the lazy_attributes plugin.
    module LazyAttributes
      # Lazy attributes requires the tactical_eager_loading plugin
      def self.apply(model, *attrs)
        model.plugin :tactical_eager_loading  
      end
      
      # Set the attributes given as lazy attributes
      def self.configure(model, *attrs)
        model.lazy_attributes(*attrs) unless attrs.empty?
      end
      
      module ClassMethods
        # Freeze lazy attributes module when freezing model class.
        def freeze
          @lazy_attributes_module.freeze if @lazy_attributes_module

          super
        end

        # Remove the given attributes from the list of columns selected by default.
        # For each attribute given, create an accessor method that allows a lazy
        # lookup of the attribute.  Each attribute should be given as a symbol.
        def lazy_attributes(*attrs)
          unless select = dataset.opts[:select]
            select = dataset.columns.map{|c| Sequel.qualify(dataset.first_source, c)}
          end
          set_dataset(dataset.select(*select.reject{|c| attrs.include?(dataset.send(:_hash_key_symbol, c))}))
          attrs.each{|a| define_lazy_attribute_getter(a)}
        end
        
        private

        # Add a lazy attribute getter method to the lazy_attributes_module. Options:
        # :dataset :: The base dataset to use for the lazy attribute lookup
        # :table :: The table name to use to qualify the attribute and primary key columns.
        def define_lazy_attribute_getter(a, opts=OPTS)
          include(@lazy_attributes_module ||= Module.new) unless @lazy_attributes_module
          @lazy_attributes_module.class_eval do
            define_method(a) do
              if !values.has_key?(a) && !new?
                lazy_attribute_lookup(a, opts)
              else
                super()
              end
            end
          end
        end
      end

      module InstanceMethods
        private

        # If the model was selected with other model objects, eagerly load the
        # attribute for all of those objects.  If not, query the database for
        # the attribute for just the current object.  Return the value of
        # the attribute for the current object.
        def lazy_attribute_lookup(a, opts=OPTS)
          table = opts[:table] || model.table_name
          selection = Sequel.qualify(table, a)

          if base_ds = opts[:dataset]
            ds = base_ds.where(qualified_pk_hash(table))
          else
            base_ds = model.dataset
            ds = this
          end

          if frozen?
            return ds.get(selection)
          end

          if retrieved_with
            raise(Error, "Invalid primary key column for #{model}: #{pkc.inspect}") unless primary_key = model.primary_key
            composite_pk = true if primary_key.is_a?(Array)
            id_map = {}
            retrieved_with.each{|o| id_map[o.pk] = o unless o.values.has_key?(a) || o.frozen?}
            predicate_key = composite_pk ? primary_key.map{|k| Sequel.qualify(table, k)} : Sequel.qualify(table, primary_key)
            base_ds.
             select(*(Array(primary_key).map{|k| Sequel.qualify(table, k)} + [selection])).
             where(predicate_key=>id_map.keys).
             naked.
             each do |row|
              obj = id_map[composite_pk ? row.values_at(*primary_key) : row[primary_key]]
              if obj && !obj.values.has_key?(a)
                obj.values[a] = row[a]
              end
            end
          end
          values[a] = ds.get(selection) unless values.has_key?(a)
          values[a]
        end
      end
    end
  end
end
