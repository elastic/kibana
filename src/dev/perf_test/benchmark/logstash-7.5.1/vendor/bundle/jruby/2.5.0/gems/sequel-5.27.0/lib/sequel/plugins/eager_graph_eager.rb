# frozen-string-literal: true

module Sequel
  module Plugins
    # The eager_graph_eager plugin allows for chaining eager loads after eager_graph
    # loads.  Given the following model associations:
    #
    #   Band.one_to_many :albums
    #   Album.one_to_many :tracks
    #
    # Let's say you wanted to return bands ordered by album name, and eagerly load
    # those albums, you can do that using:
    #
    #   Band.eager_graph(:albums).order{albums[:name]}
    #
    # Let's say you also wanted to eagerly load the tracks for each album. You could
    # just add them to the eager_graph call:
    #  
    #   Band.eager_graph(albums: :tracks).order{albums[:name]}
    #
    # However, the bloats the result set, and you aren't ordering by the track
    # information, so a join is not required.  The eager_graph_eager plugin allows
    # you to specify that the tracks be eagerly loaded in a separate query after
    # the eager_graph load of albums:
    # 
    #   Band.eager_graph(:albums).eager_graph_eager([:albums], :tracks).order{albums[:name]}
    #
    # <tt>Dataset#eager_graph_eager</tt>'s first argument is a dependency chain, specified
    # as an array of symbols.  This specifies the point at which to perform the eager load.
    # The remaining arguments are arguments that could be passed to Dataset#eager to specify
    # what dependent associations should be loaded at that point.
    #
    # If you also have the following model association:
    #
    #   Track.one_to_many :lyrics
    #
    # Here's some different ways of performing eager loading:
    #
    #   # 4 Queries: bands, albums, tracks, lyrics
    #   Band.eager(albums: {tracks: :lyrics})
    #
    #   # 1 Query: bands+albums+tracks+lyrics
    #   Band.eager_graph(albums: {tracks: :lyrics})
    #
    #   # 3 Queries: bands+albums, tracks, lyrics
    #   Band.eager_graph(:albums).eager_graph_eager([:albums], tracks: :lyrics)
    #
    #   # 2 Queries: bands+albums+tracks, lyrics
    #   Band.eager_graph(albums: :tracks).eager_graph_eager([:albums, :tracks], :lyrics)
    #
    #   # 2 Queries: bands+albums, tracks+lyrics
    #   Band.eager_graph(:albums).eager_graph_eager([:albums], tracks: proc{|ds| ds.eager_graph(:lyrics)})
    #
    # Usage:
    #
    #   # Support eager_graph_eager in all subclass datasets (called before loading subclasses)
    #   Sequel::Model.plugin :eager_graph_eager
    #
    #   # Support eager_graph_eager in Album class datasets
    #   Album.plugin :eager_graph_eager
    module EagerGraphEager
      module DatasetMethods
        # Specify for the given dependency chain, after loading objects for the
        # current dataset via eager_graph, eagerly load the given associations at that point in the
        # dependency chain.
        #
        # dependency_chain :: Array of association symbols, with the first association symbol
        #                     specifying an association in the dataset's model, the next
        #                     association specifying an association in the previous association's
        #                     associated model, and so on.
        # assocs :: Symbols or hashes specifying associations to eagerly load at the point
        #           specified by the dependency chain.
        def eager_graph_eager(dependency_chain, *assocs)
          unless dependency_chain.is_a?(Array) && dependency_chain.all?{|s| s.is_a?(Symbol)} && !dependency_chain.empty?
            raise Error, "eager_graph_eager first argument must be array of symbols"
          end

          current = model
          deps = dependency_chain.map do |dep|
            unless ref = current.association_reflection(dep)
              raise Error, "invalid association #{dep.inspect} for #{current.inspect}"
            end
            current = ref.associated_class
            [dep, ref.returns_array?]
          end
          assocs = current.dataset.send(:eager_options_for_associations, assocs)

          deps.each(&:freeze)
          deps.unshift(current)
          deps.freeze

          assocs.freeze

          if h = @opts[:eager_graph_eager]
            h = Hash[h]
            h[deps] = assocs
          else
            h = {deps => assocs}
          end

          clone(:eager_graph_eager=>h.freeze)
        end

        protected

        # After building objects from the rows, if eager_graph_eager has been
        # called on the datasets, for each dependency chain specified, eagerly
        # load the appropriate associations.
        def eager_graph_build_associations(rows)
          objects = super

          if eager_data = @opts[:eager_graph_eager]
            eager_data.each do |deps, assocs|
              current = objects

              last_class, *deps = deps
              deps.each do |dep, is_multiple|
                current_assocs = current.map(&:associations)

                if is_multiple
                  current = current_assocs.flat_map{|a| a[dep]}
                else
                  current = current_assocs.map{|a| a[dep]}
                  current.compact!
                end

                current.uniq!(&:object_id)
              end

              last_class.dataset.send(:eager_load, current, assocs)
            end
          end

          objects
        end
      end
    end
  end
end
