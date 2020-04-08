# frozen-string-literal: true

module Sequel
  module Plugins
    # The eager_each plugin makes calling each on an eager loaded dataset do eager loading.
    # By default, each does not work on an eager loaded dataset, because each iterates
    # over rows of the dataset as they come in, and to eagerly load you need to have all
    # values up front.  With the default associations code, you must call #all on an eagerly
    # loaded dataset, as calling #each on an #eager dataset skips the eager loading, and calling
    # #each on an #eager_graph dataset makes it yield plain hashes with columns from all
    # tables, instead of yielding the instances of the main model.
    #
    # This plugin makes #each call #all for eagerly loaded datasets.  As #all usually calls
    # #each, this is a bit of issue, but this plugin resolves the issue by cloning the dataset
    # and setting a new flag in the cloned dataset, so that each can check with the flag to
    # determine whether it should call all.
    #
    # This plugin also makes #first and related methods that load single records work with
    # eager loading.  Note that when using eager_graph, calling #first or a similar method
    # will result in two queries, one to load the main object, and one to eagerly load all associated
    # objects to that main object.
    #
    # Usage:
    #
    #   # Make all model subclass instances eagerly load for each (called before loading subclasses)
    #   Sequel::Model.plugin :eager_each
    #
    #   # Make the Album class eagerly load for each
    #   Album.plugin :eager_each
    module EagerEach 
      module DatasetMethods
        # Don't call #all when attempting to load the columns.
        def columns!
          if use_eager_all?
            clone(:all_called=>true).columns!
          else
            super
          end
        end

        # Call #all instead of #each if eager loading,
        # unless #each is being called by #all.
        def each(&block)
          if use_eager_all?
            all(&block)
          else
            super
          end
        end

        # If eager loading, clone the dataset and set a flag to let #each know not to call #all,
        # to avoid the infinite loop.
        def all(&block)
          if use_eager_all?
            clone(:all_called=>true).all(&block)
          else
            super
          end
        end

        # Handle eager loading when calling first and related methods.  For eager_graph,
        # this does an additional query after retrieving a single record, because otherwise
        # the associated records won't get eager loaded correctly.
        def single_record!
          if use_eager_all?
            obj = clone(:all_called=>true).all.first

            if opts[:eager_graph]
              obj = clone(:all_called=>true).where(obj.qualified_pk_hash).unlimited.all.first
            end

            obj
          else
            super
          end
        end

        private

        # Wether to use all when each is called, true when eager loading
        # unless the flag has already been set.
        def use_eager_all?
          (opts[:eager] || opts[:eager_graph]) && !opts[:all_called]
        end
      end
    end
  end
end
