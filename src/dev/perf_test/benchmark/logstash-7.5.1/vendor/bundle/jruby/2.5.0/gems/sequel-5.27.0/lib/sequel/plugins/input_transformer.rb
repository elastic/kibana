# frozen-string-literal: true

module Sequel
  module Plugins
    # InputTransformer is a plugin that allows generic transformations
    # of input values in model column setters.  Example:
    #
    #   Album.plugin :input_transformer
    #   Album.add_input_transformer(:reverser){|v| v.is_a?(String) ? v.reverse : v}
    #   album = Album.new(name: 'foo')
    #   album.name # => 'oof'
    #
    # You can specifically set some columns to skip some input
    # input transformers:
    #
    #   Album.skip_input_transformer(:reverser, :foo)
    #   Album.new(foo: 'bar').foo # => 'bar'
    # 
    # Usage:
    #
    #   # Make all model subclass instances support input transformers (called before loading subclasses)
    #   Sequel::Model.plugin :input_transformer
    #
    #   # Make the Album class support input transformers 
    #   Album.plugin :input_transformer
    module InputTransformer
      def self.apply(model, *)
        model.instance_exec do
          @input_transformers = {}
          @skip_input_transformer_columns = {}
        end
      end

      # If an input transformer is given in the plugin call,
      # add it as a transformer
      def self.configure(model, transformer_name=nil, &block)
        model.add_input_transformer(transformer_name, &block) if transformer_name || block
      end

      module ClassMethods
        # Hash of input transformer name symbols to transformer callables.
        attr_reader :input_transformers

        # The order in which to call the input transformers. For backwards compatibility only.
        def input_transformer_order
          input_transformers.keys.reverse
        end

        Plugins.inherited_instance_variables(self, :@skip_input_transformer_columns=>:hash_dup, :@input_transformers=>:dup)

        # Add an input transformer to this model.
        def add_input_transformer(transformer_name, &block)
          raise(Error, 'must provide both transformer name and block when adding input transformer') unless transformer_name && block
          @input_transformers[transformer_name] = block
          @skip_input_transformer_columns[transformer_name] = []
        end

        # Freeze input transformers when freezing model class
        def freeze
          @input_transformers.freeze
          @skip_input_transformer_columns.freeze.each_value(&:freeze)

          super
        end

        # Set columns that the transformer should skip.
        def skip_input_transformer(transformer_name, *columns)
          @skip_input_transformer_columns[transformer_name].concat(columns).uniq!
        end

        # Return true if the transformer should not be called for the given column.
        def skip_input_transformer?(transformer_name, column)
          @skip_input_transformer_columns[transformer_name].include?(column)
        end
      end

      module InstanceMethods
        # Transform the input using all of the transformers, except those explicitly
        # skipped, before setting the value in the model object.
        def []=(k, v)
          model.input_transformers.reverse_each do |name, transformer|
            v = transformer.call(v) unless model.skip_input_transformer?(name, k)
          end
          super
        end
      end
    end
  end
end
