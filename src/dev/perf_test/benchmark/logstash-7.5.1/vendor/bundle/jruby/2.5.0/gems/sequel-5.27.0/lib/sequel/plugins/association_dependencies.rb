# frozen-string-literal: true

module Sequel
  module Plugins
    # The association_dependencies plugin allows you do easily set up before and/or after destroy hooks
    # for destroying, deleting, or nullifying associated model objects.  The following
    # association types support the following dependency actions:
    # 
    # :many_to_many :: :nullify (removes all related entries in join table)
    # :many_to_one :: :delete, :destroy
    # :one_to_many, one_to_one :: :delete, :destroy, :nullify (sets foreign key to NULL for all associated objects)
    #
    # This plugin works directly with the association datasets and does not use any cached association values.
    # The :delete action will delete all associated objects from the database in a single SQL call.
    # The :destroy action will load each associated object from the database and call the destroy method on it.
    #
    # To set up an association dependency, you must provide a hash with association name symbols
    # and dependency action values.  You can provide the hash to the plugin call itself or
    # to the add_association_dependencies method:
    #
    #   Business.plugin :association_dependencies, address: :delete
    #   # or:
    #   Artist.plugin :association_dependencies
    #   Artist.add_association_dependencies albums: :destroy, reviews: :delete, tags: :nullify
    module AssociationDependencies
      # Mapping of association types to when the dependency calls should be made (either
      # :before for in before_destroy or :after for in after_destroy)
      ASSOCIATION_MAPPING = {:one_to_many=>:before, :many_to_one=>:after, :many_to_many=>:before, :one_to_one=>:before}.freeze

      # The valid dependence actions
      DEPENDENCE_ACTIONS = [:delete, :destroy, :nullify].freeze

      # Initialize the association_dependencies hash for this model.
      def self.apply(model, hash=OPTS)
        model.instance_exec{@association_dependencies = {:before_delete=>[], :before_destroy=>[], :before_nullify=>[], :after_delete=>[], :after_destroy=>[]}}
      end

      # Call add_association_dependencies with any dependencies given in the plugin call.
      def self.configure(model, hash=OPTS)
        model.add_association_dependencies(hash) unless hash.empty?
      end

      module ClassMethods
        # A hash specifying the association dependencies for each model.  The keys
        # are symbols indicating the type of action and when it should be executed
        # (e.g. :before_delete).  Values are an array of method symbols.
        # For before_nullify, the symbols are remove_all_association methods.  For other
        # types, the symbols are association_dataset methods, on which delete or
        # destroy is called.
        attr_reader :association_dependencies

        # Add association dependencies to this model.  The hash should have association name
        # symbol keys and dependency action symbol values (e.g. albums: :destroy).
        def add_association_dependencies(hash)
          hash.each do |association, action|
            raise(Error, "Nonexistent association: #{association}") unless r = association_reflection(association)
            type = r[:type]
            raise(Error, "Invalid dependence action type: association: #{association}, dependence action: #{action}") unless DEPENDENCE_ACTIONS.include?(action)
            raise(Error, "Invalid association type: association: #{association}, type: #{type}") unless time = ASSOCIATION_MAPPING[type]
            association_dependencies[:"#{time}_#{action}"] << if action == :nullify
              case type
              when :one_to_many , :many_to_many
                [r[:remove_all_method]]
              when :one_to_one
                [r[:setter_method], nil]
              else
                raise(Error, "Can't nullify many_to_one associated objects: association: #{association}")
              end
            else
              raise(Error, "Can only nullify many_to_many associations: association: #{association}") if type == :many_to_many
              r[:dataset_method]
            end
          end
        end

        # Freeze association dependencies when freezing model class.
        def freeze
          @association_dependencies.freeze.each_value(&:freeze)

          super
        end

        Plugins.inherited_instance_variables(self, :@association_dependencies=>:hash_dup)
      end

      module InstanceMethods
        # Run the delete and destroy association dependency actions for
        # many_to_one associations.
        def after_destroy
          super
          model.association_dependencies[:after_delete].each{|m| public_send(m).delete}
          model.association_dependencies[:after_destroy].each{|m| public_send(m).destroy}
        end

        # Run the delete, destroy, and nullify association dependency actions for
        # *_to_many associations.
        def before_destroy
          model.association_dependencies[:before_delete].each{|m| public_send(m).delete}
          model.association_dependencies[:before_destroy].each{|m| public_send(m).destroy}
          model.association_dependencies[:before_nullify].each{|args| public_send(*args)}
          super
        end
      end
    end
  end
end
