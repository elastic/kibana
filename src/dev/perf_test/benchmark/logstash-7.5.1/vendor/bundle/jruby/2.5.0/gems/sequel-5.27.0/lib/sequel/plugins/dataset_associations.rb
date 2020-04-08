# frozen-string-literal: true

module Sequel
  module Plugins
    # DatasetAssociations allows you to easily use your model associations
    # via datasets.  For each association you define, it creates a dataset
    # method for that association that returns a dataset of all objects
    # that are associated to objects in the current dataset.  Here's a simple
    # example:
    #
    #   class Artist < Sequel::Model
    #     plugin :dataset_associations
    #     one_to_many :albums
    #   end
    #   Artist.where(id: 1..100).albums
    #   # SELECT * FROM albums
    #   # WHERE (albums.artist_id IN (
    #   #   SELECT id FROM artists
    #   #   WHERE ((id >= 1) AND (id <= 100))))
    # 
    # This works for all of the association types that ship with Sequel,
    # including ones implemented in other plugins.  Most association options that
    # are supported when eager loading are supported when using a
    # dataset association. However, it will only work for limited associations or
    # *_one associations with orders if the database supports window functions.
    #
    # As the dataset methods return datasets, you can easily chain the
    # methods to get associated datasets of associated datasets:
    #
    #   Artist.where(id: 1..100).albums.where{name < 'M'}.tags
    #   # SELECT tags.* FROM tags
    #   # WHERE (tags.id IN (
    #   #   SELECT albums_tags.tag_id FROM albums
    #   #   INNER JOIN albums_tags
    #   #     ON (albums_tags.album_id = albums.id)
    #   #   WHERE
    #   #     ((albums.artist_id IN (
    #   #       SELECT id FROM artists
    #   #       WHERE ((id >= 1) AND (id <= 100)))
    #   #     AND
    #   #     (name < 'M')))))
    #
    # For associations that do JOINs, such as many_to_many, note that the datasets returned
    # by a dataset association method do not do a JOIN by default (they use a subquery that
    # JOINs).  This can cause problems when you are doing a select, order, or filter on a
    # column in the joined table.  In that case, you should use the +:dataset_associations_join+
    # option in the association, which will make sure the datasets returned by the dataset
    # association methods also use JOINs, allowing such dataset association methods to work
    # correctly.
    # 
    # Usage:
    #
    #   # Make all model subclasses create association methods for datasets
    #   Sequel::Model.plugin :dataset_associations
    #
    #   # Make the Album class create association methods for datasets
    #   Album.plugin :dataset_associations
    module DatasetAssociations
      module ClassMethods
        # Set up a dataset method for each association to return an associated dataset
        def associate(type, name, *)
          ret = super
          r = association_reflection(name)
          meth = r.returns_array? ? name : pluralize(name).to_sym
          dataset_module{define_method(meth){associated(name)}}
          ret
        end

        Plugins.def_dataset_methods(self, :associated)
      end

      module DatasetMethods
        # For the association given by +name+, return a dataset of associated objects
        # such that it would return the union of calling the association method on
        # all objects returned by the current dataset.
        #
        # This supports most options that are supported when eager loading.  However, it
        # will only work for limited associations or *_one associations with orders if the
        # database supports window functions.
        def associated(name)
          raise Error, "unrecognized association name: #{name.inspect}" unless r = model.association_reflection(name)
          ds = r.associated_class.dataset
          sds = opts[:limit] ? self : unordered
          ds = case r[:type]
          when :many_to_one
            ds.where(r.qualified_primary_key=>sds.select(*Array(r[:qualified_key])))
          when :one_to_one, :one_to_many
            r.send(:apply_filter_by_associations_limit_strategy, ds.where(r.qualified_key=>sds.select(*Array(r.qualified_primary_key))))
          when :many_to_many, :one_through_one
            mds = r.associated_class.dataset.
              join(r[:join_table], r[:right_keys].zip(r.right_primary_keys)).
              select(*Array(r.qualified_right_key)).
              where(r.qualify(r.join_table_alias, r[:left_keys])=>sds.select(*r.qualify(model.table_name, r[:left_primary_key_columns])))
            ds.where(r.qualified_right_primary_key=>r.send(:apply_filter_by_associations_limit_strategy, mds))
          when :many_through_many, :one_through_many
            if r.reverse_edges.empty?
              mds = r.associated_dataset
              fe = r.edges.first
              selection = Array(r.qualify(fe[:table], r.final_edge[:left]))
              predicate_key = r.qualify(fe[:table], fe[:right])
            else
              mds = model.dataset
              iq = model.table_name
              edges = r.edges.map(&:dup)
              edges << r.final_edge.dup
              edges.each do |e|
                alias_expr = e[:table]
                aliaz = mds.unused_table_alias(e[:table])
                unless aliaz == alias_expr
                  alias_expr = Sequel.as(e[:table], aliaz)
                end
                e[:alias] = aliaz
                mds = mds.join(alias_expr, Array(e[:right]).zip(Array(e[:left])), :implicit_qualifier=>iq)
                iq = nil
              end
              fe, f1e, f2e = edges.values_at(0, -1, -2)
              selection = Array(r.qualify(f2e[:alias], f1e[:left]))
              predicate_key = r.qualify(fe[:alias], fe[:right])
            end

            mds = mds.
              select(*selection).
              where(predicate_key=>sds.select(*r.qualify(model.table_name, r[:left_primary_key_columns])))
            ds.where(r.qualified_right_primary_key=>r.send(:apply_filter_by_associations_limit_strategy, mds))
          when :pg_array_to_many
            ds.where(Sequel[r.primary_key=>sds.select{Sequel.pg_array_op(r.qualify(r[:model].table_name, r[:key])).unnest}])
          when :many_to_pg_array
            ds.where(Sequel.function(:coalesce, Sequel.pg_array_op(r[:key]).overlaps(sds.select{array_agg(r.qualify(r[:model].table_name, r.primary_key))}), false))
          else
            raise Error, "unrecognized association type for association #{name.inspect}: #{r[:type].inspect}"
          end

          ds = r.apply_eager_dataset_changes(ds).unlimited

          if r[:dataset_associations_join]
            case r[:type]
            when :many_to_many, :one_through_one
              ds = ds.join(r[:join_table], r[:right_keys].zip(r.right_primary_keys))
            when :many_through_many, :one_through_many
              (r.reverse_edges + [r.final_reverse_edge]).each{|e| ds = ds.join(e[:table], e.fetch(:only_conditions, (Array(e[:left]).zip(Array(e[:right])) + Array(e[:conditions]))), :table_alias=>ds.unused_table_alias(e[:table]), :qualify=>:deep, &e[:block])}
            end
          end

          ds
        end
      end
    end
  end
end
