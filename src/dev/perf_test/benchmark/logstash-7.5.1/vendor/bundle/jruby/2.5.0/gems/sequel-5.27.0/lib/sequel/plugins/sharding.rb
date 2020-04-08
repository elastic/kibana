# frozen-string-literal: true

module Sequel
  module Plugins
    # The sharding plugin augments Sequel's default model sharding support
    # in the following ways:
    #
    # * It automatically saves model instances back to the
    #   shard they were retreived from.
    # * It makes model associations use the same shard as the model object.
    # * It adds a slightly nicer API for creating model instances on
    #   specific shards.
    # 
    # Usage:
    #
    #   # Add the sharding support to all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :sharding
    #
    #   # Add the sharding support to the Album class
    #   Album.plugin :sharding
    module Sharding
      module ClassMethods
        # Create a new object on the given shard s.
        def create_using_server(s, values=OPTS, &block)
          new_using_server(s, values, &block).save
        end

        # Eager load the association with the given eager loader options.
        def eager_load_results(opts, eo, &block)
          if (s = eo[:self]) && (server = s.opts[:server])
            eb = eo[:eager_block]
            set_server = proc do |ds|
              ds = eb.call(ds) if eb
              ds = ds.server?(server)
              ds
            end
            eo = Hash[eo]
            eo[:eager_block] = set_server
            eo
          end

          super
        end

        # Return a newly instantiated object that is tied to the given
        # shard s.  When the object is saved, a record will be inserted
        # on shard s.
        def new_using_server(s, values=OPTS, &block)
          new(values, &block).set_server(s)
        end

        private

        # Set the server for each graphed dataset to the current server
        # unless the graphed dataset already has a server set.
        def eager_graph_dataset(opts, eager_options)
          ds = super
          if s = eager_options[:self].opts[:server]
            ds = ds.server?(s)
          end
          ds
        end
      end

      module InstanceMethods
        # Set the server that this object is tied to, unless it has
        # already been set.  Returns self.
        def set_server?(s)
          @server ||= s
          self
        end

        private

        # Ensure that association datasets are tied to the correct shard.
        def _apply_association_options(*args)
          use_server(super)
        end

        # Don't use an associated object loader, as it won't respect the shard used.
        def _associated_object_loader(opts, dynamic_opts)
          nil
        end

        # Ensure that the join table for many_to_many associations uses the correct shard.
        def _join_table_dataset(opts)
          use_server(super)
        end

        # If creating the object by doing <tt>add_association</tt> for a
        # +many_to_many+ association, make sure the associated object is created on the
        # current object's shard, unless the passed object already has an assigned shard.
        def ensure_associated_primary_key(opts, o, *args)
          o.set_server?(@server) if o.respond_to?(:set_server?)
          super
        end

        # Don't use primary key lookup to load associated objects, since that will not
        # respect the current object's server.
        def load_with_primary_key_lookup?(opts, dynamic_opts)
          false
        end
      end

      module DatasetMethods
        # If a row proc exists on the dataset, replace it with one that calls the
        # previous row_proc, but calls set_server on the output of that row_proc,
        # ensuring that objects retrieved by a specific shard know which shard they
        # are tied to.
        def row_proc
          rp = super
          if rp
            case server = db.pool.send(:pick_server, opts[:server])
            when nil, :default, :read_only
              # nothing
            else
              old_rp = rp
              rp = proc{|r| old_rp.call(r).set_server(server)}
            end
          end
          rp 
        end
      end
    end
  end
end
