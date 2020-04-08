# frozen-string-literal: true

module Sequel
  module Plugins
    # = Overview
    #
    # The rcte_tree plugin deals with tree structured data stored
    # in the database using the adjacency list model (where child rows
    # have a foreign key pointing to the parent rows), using recursive
    # common table expressions to load all ancestors in a single query,
    # all descendants in a single query, and all descendants to a given
    # level (where level 1 is children, level 2 is children and grandchildren
    # etc.) in a single query.
    #
    # = Usage
    #
    # The rcte_tree plugin adds four associations to the model: parent, children, ancestors, and
    # descendants.  Both the parent and children are fairly standard many_to_one
    # and one_to_many associations, respectively.  However, the ancestors and
    # descendants associations are special.  Both the ancestors and descendants
    # associations will automatically set the parent and children associations,
    # respectively, for current object and all of the ancestor or descendant
    # objects, whenever they are loaded (either eagerly or lazily).  Additionally,
    # the descendants association can take a level argument when called eagerly,
    # which limits the returned objects to only that many levels in the tree (see
    # the Overview).
    #
    #   Model.plugin :rcte_tree
    #   
    #   # Lazy loading
    #   model = Model.first
    #   model.parent
    #   model.children
    #   model.ancestors # Populates :parent association for all ancestors
    #   model.descendants # Populates :children association for all descendants
    #   
    #   # Eager loading - also populates the :parent and children associations
    #   # for all ancestors and descendants
    #   Model.where(id: [1, 2]).eager(:ancestors, :descendants).all
    #   
    #   # Eager loading children and grandchildren
    #   Model.where(id: [1, 2]).eager(descendants: 2).all
    #   # Eager loading children, grandchildren, and great grandchildren
    #   Model.where(id: [1, 2]).eager(descendants: 3).all
    #
    # = Options
    #
    # You can override the options for any specific association by making
    # sure the plugin options contain one of the following keys:
    #
    # :parent :: hash of options for the parent association
    # :children :: hash of options for the children association
    # :ancestors :: hash of options for the ancestors association
    # :descendants :: hash of options for the descendants association
    #
    # Note that you can change the name of the above associations by specifying
    # a :name key in the appropriate hash of options above.  For example:
    #
    #   Model.plugin :rcte_tree, parent: {name: :mother},
    #    children: {name: :daughters}, descendants: {name: :offspring}
    #
    # Any other keys in the main options hash are treated as options shared by
    # all of the associations.  Here's a few options that affect the plugin:
    #
    # :key :: The foreign key in the table that points to the primary key
    #         of the parent (default: :parent_id)
    # :primary_key :: The primary key to use (default: the model's primary key)
    # :key_alias :: The symbol identifier to use for aliasing when eager
    #               loading (default: :x_root_x)
    # :cte_name :: The symbol identifier to use for the common table expression
    #              (default: :t)
    # :level_alias :: The symbol identifier to use when eagerly loading descendants
    #                 up to a given level (default: :x_level_x)
    module RcteTree
      # Create the appropriate parent, children, ancestors, and descendants
      # associations for the model.
      def self.apply(model, opts=OPTS)
        model.plugin :tree, opts

        opts = opts.dup
        opts[:class] = model
        opts[:methods_module] = Module.new
        model.send(:include, opts[:methods_module])
        
        key = opts[:key] ||= :parent_id
        prkey = opts[:primary_key] ||= model.primary_key
        ka = opts[:key_alias] ||= :x_root_x
        t = opts[:cte_name] ||= :t
        c_all = if model.dataset.recursive_cte_requires_column_aliases?
          # Work around Oracle/ruby-oci8 bug that returns integers as BigDecimals in recursive queries.
          conv_bd = model.db.database_type == :oracle
          col_aliases = model.dataset.columns
          model_table = model.table_name
          col_aliases.map{|c| SQL::QualifiedIdentifier.new(model_table, c)}
        else
          [SQL::ColumnAll.new(model.table_name)]
        end
        
        bd_conv = lambda{|v| conv_bd && v.is_a?(BigDecimal) ? v.to_i : v}

        key_array = Array(key)
        prkey_array = Array(prkey)
        if key.is_a?(Array)
          key_conv = lambda{|m| key_array.map{|k| m[k]}}
          key_present = lambda{|m| key_conv[m].all?}
          prkey_conv = lambda{|m| prkey_array.map{|k| m[k]}}
          key_aliases = (0...key_array.length).map{|i| :"#{ka}_#{i}"}
          ancestor_base_case_columns = prkey_array.zip(key_aliases).map{|k, ka_| SQL::AliasedExpression.new(k, ka_)} + c_all
          descendant_base_case_columns = key_array.zip(key_aliases).map{|k, ka_| SQL::AliasedExpression.new(k, ka_)} + c_all
          recursive_case_columns = prkey_array.zip(key_aliases).map{|k, ka_| SQL::QualifiedIdentifier.new(t, ka_)} + c_all
          extract_key_alias = lambda{|m| key_aliases.map{|ka_| bd_conv[m.values.delete(ka_)]}}
        else
          key_present = key_conv = lambda{|m| m[key]}
          prkey_conv = lambda{|m| m[prkey]}
          key_aliases = [ka]
          ancestor_base_case_columns = [SQL::AliasedExpression.new(prkey, ka)] + c_all
          descendant_base_case_columns = [SQL::AliasedExpression.new(key, ka)] + c_all
          recursive_case_columns = [SQL::QualifiedIdentifier.new(t, ka)] + c_all
          extract_key_alias = lambda{|m| bd_conv[m.values.delete(ka)]}
        end
        
        parent = opts.merge(opts.fetch(:parent, OPTS)).fetch(:name, :parent)
        childrena = opts.merge(opts.fetch(:children, OPTS)).fetch(:name, :children)
        
        opts[:reciprocal] = nil
        a = opts.merge(opts.fetch(:ancestors, OPTS))
        ancestors = a.fetch(:name, :ancestors)
        a[:read_only] = true unless a.has_key?(:read_only)
        a[:eager_grapher] = proc do |_|
          raise Sequel::Error, "the #{ancestors} association for #{self} does not support eager graphing"
        end
        a[:eager_loader_key] = key
        a[:dataset] ||= proc do
          base_ds = model.where(prkey_array.zip(key_array.map{|k| get_column_value(k)}))
          recursive_ds = model.join(t, key_array.zip(prkey_array))
          if c = a[:conditions]
            (base_ds, recursive_ds) = [base_ds, recursive_ds].map do |ds|
              (c.is_a?(Array) && !Sequel.condition_specifier?(c)) ? ds.where(*c) : ds.where(c)
            end
          end
          table_alias = model.dataset.schema_and_table(model.table_name)[1].to_sym
          model.from(SQL::AliasedExpression.new(t, table_alias)).
           with_recursive(t, col_aliases ? base_ds.select(*col_aliases) : base_ds.select_all,
            recursive_ds.select(*c_all),
            :args=>col_aliases)
        end
        aal = Array(a[:after_load])
        aal << proc do |m, ancs|
          unless m.associations.has_key?(parent)
            parent_map = {prkey_conv[m]=>m}
            child_map = {}
            child_map[key_conv[m]] = m if key_present[m]
            m.associations[parent] = nil
            ancs.each do |obj|
              obj.associations[parent] = nil
              parent_map[prkey_conv[obj]] = obj
              if ok = key_conv[obj]
                child_map[ok] = obj
              end
            end
            parent_map.each do |parent_id, obj|
              if child = child_map[parent_id]
                child.associations[parent] = obj
              end
            end
          end
        end
        a[:after_load] ||= aal
        a[:eager_loader] ||= proc do |eo|
          id_map = eo[:id_map]
          parent_map = {}
          children_map = {}
          eo[:rows].each do |obj|
            parent_map[prkey_conv[obj]] = obj
            (children_map[key_conv[obj]] ||= []) << obj
            obj.associations[ancestors] = []
            obj.associations[parent] = nil
          end
          r = model.association_reflection(ancestors)
          base_case = model.where(prkey=>id_map.keys).
           select(*ancestor_base_case_columns)
          recursive_case = model.join(t, key_array.zip(prkey_array)).
           select(*recursive_case_columns)
          if c = r[:conditions]
            (base_case, recursive_case) = [base_case, recursive_case].map do |ds|
              (c.is_a?(Array) && !Sequel.condition_specifier?(c)) ? ds.where(*c) : ds.where(c)
            end
          end
          table_alias = model.dataset.schema_and_table(model.table_name)[1].to_sym
          ds = model.from(SQL::AliasedExpression.new(t, table_alias)).
            with_recursive(t, base_case, recursive_case,
             :args=>((key_aliases + col_aliases) if col_aliases))
          ds = r.apply_eager_dataset_changes(ds)
          ds = ds.select_append(ka) unless ds.opts[:select] == nil
          model.eager_load_results(r, eo.merge(:loader=>false, :initalize_rows=>false, :dataset=>ds, :id_map=>nil)) do |obj|
            opk = prkey_conv[obj]
            if parent_map.has_key?(opk)
              if idm_obj = parent_map[opk]
                key_aliases.each{|ka_| idm_obj.values[ka_] = obj.values[ka_]}
                obj = idm_obj
              end
            else
              obj.associations[parent] = nil
              parent_map[opk] = obj
              (children_map[key_conv[obj]] ||= []) << obj
            end
            
            if roots = id_map[extract_key_alias[obj]]
              roots.each do |root|
                root.associations[ancestors] << obj
              end
            end
          end
          parent_map.each do |parent_id, obj|
            if children = children_map[parent_id]
              children.each do |child|
                child.associations[parent] = obj
              end
            end
          end
        end
        model.one_to_many ancestors, a
        
        d = opts.merge(opts.fetch(:descendants, OPTS))
        descendants = d.fetch(:name, :descendants)
        d[:read_only] = true unless d.has_key?(:read_only)
        d[:eager_grapher] = proc do |_|
          raise Sequel::Error, "the #{descendants} association for #{self} does not support eager graphing"
        end
        la = d[:level_alias] ||= :x_level_x
        d[:dataset] ||= proc do
          base_ds = model.where(key_array.zip(prkey_array.map{|k| get_column_value(k)}))
          recursive_ds = model.join(t, prkey_array.zip(key_array))
          if c = d[:conditions]
            (base_ds, recursive_ds) = [base_ds, recursive_ds].map do |ds|
              (c.is_a?(Array) && !Sequel.condition_specifier?(c)) ? ds.where(*c) : ds.where(c)
            end
          end
          table_alias = model.dataset.schema_and_table(model.table_name)[1].to_sym
          model.from(SQL::AliasedExpression.new(t, table_alias)).
           with_recursive(t, col_aliases ? base_ds.select(*col_aliases) : base_ds.select_all,
            recursive_ds.select(*c_all),
            :args=>col_aliases)
          end
        dal = Array(d[:after_load])
        dal << proc do |m, descs|
          unless m.associations.has_key?(childrena)
            parent_map = {prkey_conv[m]=>m}
            children_map = {}
            m.associations[childrena] = []
            descs.each do |obj|
              obj.associations[childrena] = []
              if opk = prkey_conv[obj]
                parent_map[opk] = obj
              end
              if ok = key_conv[obj]
                (children_map[ok] ||= []) << obj
              end
            end
            children_map.each do |parent_id, objs|
              parent_obj = parent_map[parent_id]
              parent_obj.associations[childrena] = objs
              objs.each do |obj|
                obj.associations[parent] = parent_obj
              end
            end
          end
        end
        d[:after_load] = dal
        d[:eager_loader] ||= proc do |eo|
          id_map = eo[:id_map]
          associations = eo[:associations]
          parent_map = {}
          children_map = {}
          eo[:rows].each do |obj|
            parent_map[prkey_conv[obj]] = obj
            obj.associations[descendants] = []
            obj.associations[childrena] = []
          end
          r = model.association_reflection(descendants)
          base_case = model.where(key=>id_map.keys).
           select(*descendant_base_case_columns)
          recursive_case = model.join(t, prkey_array.zip(key_array)).
           select(*recursive_case_columns)
          if c = r[:conditions]
            (base_case, recursive_case) = [base_case, recursive_case].map do |ds|
              (c.is_a?(Array) && !Sequel.condition_specifier?(c)) ? ds.where(*c) : ds.where(c)
            end
          end
          if associations.is_a?(Integer)
            level = associations
            no_cache_level = level - 1
            associations = {}
            base_case = base_case.select_append(SQL::AliasedExpression.new(Sequel.cast(0, Integer), la))
            recursive_case = recursive_case.select_append(SQL::AliasedExpression.new(SQL::QualifiedIdentifier.new(t, la) + 1, la)).where(SQL::QualifiedIdentifier.new(t, la) < level - 1)
          end
          table_alias = model.dataset.schema_and_table(model.table_name)[1].to_sym
          ds = model.from(SQL::AliasedExpression.new(t, table_alias)).
            with_recursive(t, base_case, recursive_case,
              :args=>((key_aliases + col_aliases + (level ? [la] : [])) if col_aliases))
          ds = r.apply_eager_dataset_changes(ds)
          ds = ds.select_append(ka) unless ds.opts[:select] == nil
          model.eager_load_results(r, eo.merge(:loader=>false, :initalize_rows=>false, :dataset=>ds, :id_map=>nil, :associations=>OPTS)) do |obj|
            if level
              no_cache = no_cache_level == obj.values.delete(la)
            end
            
            opk = prkey_conv[obj]
            if parent_map.has_key?(opk)
              if idm_obj = parent_map[opk]
                key_aliases.each{|ka_| idm_obj.values[ka_] = obj.values[ka_]}
                obj = idm_obj
              end
            else
              obj.associations[childrena] = [] unless no_cache
              parent_map[opk] = obj
            end
            
            if root = id_map[extract_key_alias[obj]].first
              root.associations[descendants] << obj
            end
            
            (children_map[key_conv[obj]] ||= []) << obj
          end
          children_map.each do |parent_id, objs|
            objs = objs.uniq
            parent_obj = parent_map[parent_id]
            parent_obj.associations[childrena] = objs
            objs.each do |obj|
              obj.associations[parent] = parent_obj
            end
          end
        end
        model.one_to_many descendants, d
      end
    end
  end
end
