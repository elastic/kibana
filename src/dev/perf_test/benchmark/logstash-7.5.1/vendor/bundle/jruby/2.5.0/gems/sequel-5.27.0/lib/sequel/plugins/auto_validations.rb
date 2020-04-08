# frozen-string-literal: true

module Sequel
  module Plugins
    # The auto_validations plugin automatically sets up the following types of validations
    # for your model columns:
    #
    # 1. type validations for all columns
    # 2. not_null validations on NOT NULL columns (optionally, presence validations)
    # 3. unique validations on columns or sets of columns with unique indexes
    # 4. max length validations on string columns
    #
    # To determine the columns to use for the type/not_null/max_length validations,
    # the plugin looks at the database schema for the model's table.  To determine
    # the unique validations, Sequel looks at the indexes on the table.  In order
    # for this plugin to be fully functional, the underlying database adapter needs
    # to support both schema and index parsing.
    #
    # This plugin uses the validation_helpers plugin underneath to implement the
    # validations.  It does not allow for any per-column validation message
    # customization, but you can alter the messages for the given type of validation
    # on a per-model basis (see the validation_helpers documentation).
    #
    # You can skip certain types of validations from being automatically added via:
    #
    #   Model.skip_auto_validations(:not_null)
    #
    # If you want to skip all auto validations (only useful if loading the plugin
    # in a superclass):
    #
    #   Model.skip_auto_validations(:all)
    #
    # It is possible to skip auto validations on a per-model-instance basis via:
    #
    #   instance.skip_auto_validations(:unique, :not_null) do
    #     puts instance.valid?
    #   end
    #
    # By default, the plugin uses a not_null validation for NOT NULL columns, but that
    # can be changed to a presence validation using an option:
    #
    #   Model.plugin :auto_validations, not_null: :presence
    #
    # This is useful if you want to enforce that NOT NULL string columns do not
    # allow empty values.
    #
    # You can also supply hashes to pass options through to the underlying validators:
    #
    #   Model.plugin :auto_validations, unique_opts: {only_if_modified: true}
    #
    # This works for unique_opts, max_length_opts, schema_types_opts,
    # explicit_not_null_opts, and not_null_opts.
    #
    # Usage:
    #
    #   # Make all model subclass use auto validations (called before loading subclasses)
    #   Sequel::Model.plugin :auto_validations
    #
    #   # Make the Album class use auto validations
    #   Album.plugin :auto_validations
    module AutoValidations
      NOT_NULL_OPTIONS = {:from=>:values}.freeze
      EXPLICIT_NOT_NULL_OPTIONS = {:from=>:values, :allow_missing=>true}.freeze
      MAX_LENGTH_OPTIONS = {:from=>:values, :allow_nil=>true}.freeze
      SCHEMA_TYPES_OPTIONS = NOT_NULL_OPTIONS
      UNIQUE_OPTIONS = NOT_NULL_OPTIONS
      EMPTY_ARRAY = [].freeze

      def self.apply(model, opts=OPTS)
        model.instance_exec do
          plugin :validation_helpers
          @auto_validate_presence = false
          @auto_validate_not_null_columns = []
          @auto_validate_explicit_not_null_columns = []
          @auto_validate_max_length_columns = []
          @auto_validate_unique_columns = []
          @auto_validate_types = true

          @auto_validate_options = {
              :not_null=>NOT_NULL_OPTIONS,
              :explicit_not_null=>EXPLICIT_NOT_NULL_OPTIONS,
              :max_length=>MAX_LENGTH_OPTIONS,
              :schema_types=>SCHEMA_TYPES_OPTIONS,
              :unique=>UNIQUE_OPTIONS
          }.freeze
        end
      end

      # Setup auto validations for the model if it has a dataset.
      def self.configure(model, opts=OPTS)
        model.instance_exec do
          setup_auto_validations if @dataset
          if opts[:not_null] == :presence
            @auto_validate_presence = true
          end

          h = @auto_validate_options.dup
          [:not_null, :explicit_not_null, :max_length, :schema_types, :unique].each do |type|
            if type_opts = opts[:"#{type}_opts"]
              h[type] = h[type].merge(type_opts).freeze
            end
          end
          @auto_validate_options = h.freeze
        end
      end

      module ClassMethods
        # The columns with automatic not_null validations
        attr_reader :auto_validate_not_null_columns

        # The columns with automatic not_null validations for columns present in the values.
        attr_reader :auto_validate_explicit_not_null_columns

        # The columns or sets of columns with automatic max_length validations, as an array of
        # pairs, with the first entry being the column name and second entry being the maximum length.
        attr_reader :auto_validate_max_length_columns

        # The columns or sets of columns with automatic unique validations
        attr_reader :auto_validate_unique_columns

        # Inherited options
        attr_reader :auto_validate_options

        Plugins.inherited_instance_variables(self, :@auto_validate_presence=>nil, :@auto_validate_types=>nil, :@auto_validate_not_null_columns=>:dup, :@auto_validate_explicit_not_null_columns=>:dup, :@auto_validate_max_length_columns=>:dup, :@auto_validate_unique_columns=>:dup, :@auto_validate_options => :dup)
        Plugins.after_set_dataset(self, :setup_auto_validations)

        # Whether to use a presence validation for not null columns
        def auto_validate_presence?
          @auto_validate_presence
        end

        # Whether to automatically validate schema types for all columns
        def auto_validate_types?
          @auto_validate_types
        end

        # Freeze auto_validation settings when freezing model class.
        def freeze
          @auto_validate_not_null_columns.freeze
          @auto_validate_explicit_not_null_columns.freeze
          @auto_validate_max_length_columns.freeze
          @auto_validate_unique_columns.freeze

          super
        end

        # Skip automatic validations for the given validation type (:not_null, :types, :unique).
        # If :all is given as the type, skip all auto validations.
        def skip_auto_validations(type)
          case type
          when :all
            [:not_null, :types, :unique, :max_length].each{|v| skip_auto_validations(v)}
          when :not_null
            auto_validate_not_null_columns.clear
            auto_validate_explicit_not_null_columns.clear
          when :types
            @auto_validate_types = false
          else
            public_send("auto_validate_#{type}_columns").clear
          end
        end

        private

        # Parse the database schema and indexes and record the columns to automatically validate.
        def setup_auto_validations
          not_null_cols, explicit_not_null_cols = db_schema.select{|col, sch| sch[:allow_null] == false}.partition{|col, sch| sch[:default].nil?}.map{|cs| cs.map{|col, sch| col}}
          @auto_validate_not_null_columns = not_null_cols - Array(primary_key)
          explicit_not_null_cols += Array(primary_key)
          @auto_validate_explicit_not_null_columns = explicit_not_null_cols.uniq
          @auto_validate_max_length_columns = db_schema.select{|col, sch| sch[:type] == :string && sch[:max_length].is_a?(Integer)}.map{|col, sch| [col, sch[:max_length]]}
          table = dataset.first_source_table
          @auto_validate_unique_columns = if db.supports_index_parsing? && [Symbol, SQL::QualifiedIdentifier, SQL::Identifier, String].any?{|c| table.is_a?(c)}
            db.indexes(table).select{|name, idx| idx[:unique] == true}.map{|name, idx| idx[:columns].length == 1 ? idx[:columns].first : idx[:columns]}
          else
            []
          end
        end
      end

      module InstanceMethods
        # Skip the given types of auto validations on this instance inside the block.
        def skip_auto_validations(*types)
          types << :all if types.empty?
          @_skip_auto_validations = types
          yield
        ensure
          @_skip_auto_validations = nil
        end

        # Validate the model's auto validations columns
        def validate
          super
          skip = @_skip_auto_validations || EMPTY_ARRAY
          return if skip.include?(:all)
          opts = model.auto_validate_options


          unless skip.include?(:not_null)
            not_null_method = model.auto_validate_presence? ? :validates_presence : :validates_not_null
            unless (not_null_columns = model.auto_validate_not_null_columns).empty?
              public_send(not_null_method, not_null_columns, opts[:not_null])
            end
            unless (not_null_columns = model.auto_validate_explicit_not_null_columns).empty?
              public_send(not_null_method, not_null_columns, opts[:explicit_not_null])
            end
          end

          unless skip.include?(:max_length) || (max_length_columns = model.auto_validate_max_length_columns).empty?
            max_length_columns.each do |col, len|
              validates_max_length(len, col, opts[:max_length])
            end
          end

          unless skip.include?(:types) || !model.auto_validate_types?
            validates_schema_types(keys, opts[:schema_types])
          end

          unless skip.include?(:unique)
            unique_opts = Hash[opts[:unique]]
            if model.respond_to?(:sti_dataset)
              unique_opts[:dataset] = model.sti_dataset
            end
            model.auto_validate_unique_columns.each{|cols| validates_unique(cols, unique_opts)}
          end
        end
      end
    end
  end
end
