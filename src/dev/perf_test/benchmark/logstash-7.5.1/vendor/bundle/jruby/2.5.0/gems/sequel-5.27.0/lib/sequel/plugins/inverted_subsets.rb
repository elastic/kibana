# frozen-string-literal: true

module Sequel
  module Plugins
    # The inverted_subsets plugin adds another method for each defined
    # subset, which inverts the condition supplied. By default, inverted
    # subset method names are prefixed with not_.
    #
    # You can change the prefix, or indeed entirely customise the inverted names,
    # by passing a block to the plugin configuration:
    #
    #   # Use an exclude_ prefix for inverted subsets instead of not_
    #   Album.plugin(:inverted_subsets){|name| "exclude_#{name}"}
    #
    # Usage:
    #
    #   # Add inverted subsets in the Album class
    #   Album.plugin :inverted_subsets
    #
    #   # This will now create two methods, published and not_published
    #   Album.dataset_module do
    #     where :published, published: true
    #   end
    #
    #   Album.published.sql
    #   # SELECT * FROM albums WHERE (published IS TRUE)
    #
    #   Album.not_published.sql
    #   # SELECT * FROM albums WHERE (published IS NOT TRUE)
    #
    module InvertedSubsets
      def self.apply(model, &block)
        model.instance_exec do
          @dataset_module_class = Class.new(@dataset_module_class) do
            include DatasetModuleMethods
            if block
              define_method(:inverted_subset_name, &block)
              private :inverted_subset_name
            end
          end
        end
      end

      module DatasetModuleMethods
        # Define a not_ prefixed subset which inverts the subset condition.
        def where(name, *args, &block)
          super
          exclude(inverted_subset_name(name), *args, &block)
        end

        private

        def inverted_subset_name(name)
          "not_#{name}"
        end
      end
    end
  end
end
