# frozen-string-literal: true

module Sequel
  module Plugins
    # The tree plugin adds additional associations and methods that allow you to 
    # treat a Model as a tree.  
    #
    # A column for holding the parent key is required and is :parent_id by default.  
    # This may be overridden by passing column name via :key.
    #
    # Optionally, a column to control order of nodes returned can be specified
    # by passing column name via :order.
    #
    # If you pass true for the :single_root option, the class will ensure there is
    # only ever one root in the tree.
    # 
    # Examples:
    #
    #   class Node < Sequel::Model
    #     plugin :tree
    #   end
    #  
    #   class Node < Sequel::Model
    #     plugin :tree, key: :parentid, order: :position
    #   end
    module Tree
      # Create parent and children associations.  Any options
      # specified are passed to both associations.  You can also
      # specify options to use for just the parent association
      # using a :parent option, and options to use for just the
      # children association using a :children option.
      def self.apply(model, opts=OPTS)
        opts = opts.dup
        opts[:class] = model
        opts[:key] ||= :parent_id

        par = opts.merge(opts.fetch(:parent, OPTS))
        parent = par.fetch(:name, :parent)
        
        chi = opts.merge(opts.fetch(:children, OPTS))
        children = chi.fetch(:name, :children)

        par[:reciprocal] = children
        chi[:reciprocal] = parent

        model.instance_exec do
          @parent_column = opts[:key]
          @tree_order = opts[:order]
          @parent_association_name = parent
          @children_association_name = children

          many_to_one parent, par
          one_to_many children, chi
          plugin SingleRoot if opts[:single_root]
        end
      end
      
      module ClassMethods
        # The column symbol or array of column symbols on which to order the tree.
        attr_accessor :tree_order
        
        # The symbol for the column containing the value pointing to the
        # parent of the leaf.
        attr_accessor :parent_column

        # The association name for the parent association
        attr_reader :parent_association_name

        # The association name for the children association
        attr_reader :children_association_name

        Plugins.inherited_instance_variables(self, :@parent_column=>nil, :@tree_order=>nil, :@parent_association_name=>nil, :@children_association_name=>nil)
        Plugins.def_dataset_methods(self, [:roots, :roots_dataset])

        # Should freeze tree order if it is an array when freezing the model class.
        def freeze
          @tree_order.freeze if @tree_order.is_a?(Array)
        
          super
        end
      end
      
      module InstanceMethods
        # Returns list of ancestors, starting from parent until root.
        #
        #   subchild1.ancestors # => [child1, root]
        def ancestors
          node, nodes = self, []
          meth = model.parent_association_name
          while par = node.send(meth)
            nodes << node = par
          end
          nodes
        end

        # Returns list of descendants
        #
        #   node.descendants # => [child1, child2, subchild1_1, subchild1_2, subchild2_1, subchild2_2]
        def descendants
          nodes = send(model.children_association_name).dup
          send(model.children_association_name).each{|child| nodes.concat(child.descendants)}
          nodes 
        end

        # Returns the root node of the tree that this node descends from.
        # This node is returned if it is a root node itself.
        def root
          ancestors.last || self
        end

        # Returns true if this is a root node, false otherwise.
        def root?
          !new? && possible_root?
        end

        # Returns all siblings and a reference to the current node.
        #
        #   subchild1.self_and_siblings # => [subchild1, subchild2]
        def self_and_siblings
          if parent = send(model.parent_association_name)
            parent.send(model.children_association_name)
          else
            model.roots
          end
        end

        # Returns all siblings of the current node.
        #
        #   subchild1.siblings # => [subchild2]
        def siblings
          self_and_siblings - [self]
        end

        private

        # True if if all parent columns values are not NULL.
        def possible_root?
          !Array(model.parent_column).map{|c| self[c]}.all?
        end
      end

      module DatasetMethods
        # Returns list of all root nodes (those with no parent nodes).
        #
        #   TreeClass.roots # => [root1, root2]
        def roots
          roots_dataset.all
        end

        # Returns the dataset for retrieval of all root nodes
        #
        #   TreeClass.roots_dataset # => Sequel::Dataset instance
        def roots_dataset
          ds = where(Sequel.or(Array(model.parent_column).zip([])))
          ds = ds.order(*model.tree_order) if model.tree_order
          ds
        end
      end

      # Plugin included when :single_root option is passed.
      module SingleRoot
        module ClassMethods
          # Returns the single root node.
          def root
            roots_dataset.first
          end
        end

        module InstanceMethods
          # Hook that prevents a second root from being created.
          def before_save
            if possible_root? && (root = model.root) && pk != root.pk
              raise TreeMultipleRootError, "there is already a root #{model.name} defined"
            end
            super
          end
        end
      end

      class TreeMultipleRootError < Error; end
    end
  end
end
