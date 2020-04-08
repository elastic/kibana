# frozen-string-literal: true

module Sequel
  module Plugins
    # The subset_conditions plugin creates an additional *_conditions method
    # for every subset created, which returns the filter conditions the subset
    # uses.  This can be useful if you want to use the conditions for a separate
    # filter or combine them with OR.
    #
    # Usage:
    #
    #   # Add subset_conditions in the Album class
    #   Album.plugin :subset_conditions
    #
    #   # This will now create a published_conditions method
    #   Album.dataset_module do
    #     subset :published, published: true
    #   end
    #
    #   Album.where(Album.published_conditions).sql
    #   # SELECT * FROM albums WHERE (published IS TRUE)
    #
    #   Album.exclude(Album.published_conditions).sql
    #   # SELECT * FROM albums WHERE (published IS NOT TRUE)
    #
    #   Album.where(Album.published_conditions | {ready: true}).sql
    #   # SELECT * FROM albums WHERE ((published IS TRUE) OR (ready IS TRUE))
    module SubsetConditions
      def self.apply(model, &block)
        model.instance_exec do
          @dataset_module_class = Class.new(@dataset_module_class) do
            include DatasetModuleMethods
          end
        end
      end

      module DatasetModuleMethods
        # Also create a method that returns the conditions the filter uses.
        def where(name, *args, &block)
          super
          cond = args
          cond = cond.first if cond.size == 1
          define_method(:"#{name}_conditions"){filter_expr(cond, &block)}
        end
      end
    end
  end
end
