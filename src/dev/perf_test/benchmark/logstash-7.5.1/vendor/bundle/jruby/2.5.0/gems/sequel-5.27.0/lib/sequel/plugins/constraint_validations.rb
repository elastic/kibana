# frozen-string-literal: true

module Sequel
  module Plugins
    # The constraint_validations plugin is designed to be used with databases
    # that used the constraint_validations extension when creating their
    # tables.  The extension adds validation metadata for constraints created,
    # and this plugin reads that metadata and automatically creates validations
    # for all of the constraints.  For example, if you used the extension
    # and created your albums table like this:
    #
    #   DB.create_table(:albums) do
    #     primary_key :id
    #     String :name
    #     validate do
    #       min_length 5, :name
    #     end
    #   end
    #
    # Then when you went to save an album that uses this plugin:
    #
    #   Album.create(name: 'abc')
    #   # raises Sequel::ValidationFailed: name is shorter than 5 characters
    # 
    # Usage:
    #
    #   # Make all model subclasses use constraint validations (called before loading subclasses)
    #   Sequel::Model.plugin :constraint_validations
    #
    #   # Make the Album class use constraint validations
    #   Album.plugin :constraint_validations
    module ConstraintValidations
      # The default constraint validation metadata table name.
      DEFAULT_CONSTRAINT_VALIDATIONS_TABLE = :sequel_constraint_validations

      # Mapping of operator names in table to ruby operators
      OPERATOR_MAP = {:str_lt => :<, :str_lte => :<=, :str_gt => :>, :str_gte => :>=,
                      :int_lt => :<, :int_lte => :<=, :int_gt => :>, :int_gte => :>=}.freeze

      # Automatically load the validation_helpers plugin to run the actual validations.
      def self.apply(model, opts=OPTS)
        model.instance_exec do
          plugin :validation_helpers
          @constraint_validations_table = DEFAULT_CONSTRAINT_VALIDATIONS_TABLE
          @constraint_validation_options = {}
        end
      end

      # Parse the constraint validations metadata from the database. Options:
      # :constraint_validations_table :: Override the name of the constraint validations
      #                                  metadata table.  Should only be used if the table
      #                                  name was overridden when creating the constraint
      #                                  validations.
      # :validation_options :: Override/augment the options stored in the database with the
      #                        given options.  Keys should be validation type symbols (e.g.
      #                        :presence) and values should be hashes of options specific
      #                        to that validation type.
      def self.configure(model, opts=OPTS)
        model.instance_exec do
          if table = opts[:constraint_validations_table]
            @constraint_validations_table = table
          end
          if vos = opts[:validation_options]
            vos.each do |k, v|
              if existing_options = @constraint_validation_options[k]       
                v = existing_options.merge(v)
              end
              @constraint_validation_options[k] = v
            end
          end
          parse_constraint_validations
        end
      end

      module ClassMethods
        # An array of validation method call arrays.  Each array is an array that
        # is splatted to send to perform a validation via validation_helpers.
        attr_reader :constraint_validations

        # A hash of reflections of constraint validations.  Keys are type name
        # symbols.  Each value is an array of pairs, with the first element being
        # the validation type symbol (e.g. :presence) and the second element being
        # options for the validation.  If the validation takes an argument, it appears
        # as the :argument entry in the validation option hash.
        attr_reader :constraint_validation_reflections

        # The name of the table containing the constraint validations metadata.
        attr_reader :constraint_validations_table

        Plugins.inherited_instance_variables(self, :@constraint_validations_table=>nil, :@constraint_validation_options=>:hash_dup)
        Plugins.after_set_dataset(self, :parse_constraint_validations)

        # Freeze constraint validations data when freezing model class.
        def freeze
          @constraint_validations.freeze.each(&:freeze)
          @constraint_validation_reflections.freeze.each_value do |v|
            v.freeze
            v.each(&:freeze)
          end
          @constraint_validation_options.freeze.each_value(&:freeze)

          super
        end

        private

        # If the database has not already parsed constraint validation
        # metadata, then run a query to get the metadata data and transform it
        # into arrays of validation method calls.
        #
        # If this model has associated dataset, use the model's table name
        # to get the validations for just this model.
        def parse_constraint_validations
          db.extension(:_model_constraint_validations)

          unless hash = Sequel.synchronize{db.constraint_validations}
            hash = {}
            db.from(constraint_validations_table).each do |r|
              (hash[r[:table]] ||= []) << r
            end
            Sequel.synchronize{db.constraint_validations = hash}
          end

          if @dataset
            ds = @dataset.with_quote_identifiers(false)
            table_name = ds.literal(ds.first_source_table)
            reflections = {}
            @constraint_validations = (Sequel.synchronize{hash[table_name]} || []).map{|r| constraint_validation_array(r, reflections)}
            @constraint_validation_reflections = reflections
          end
        end

        # Given a specific database constraint validation metadata row hash, transform
        # it in an validation method call array suitable for splatting to send.
        def constraint_validation_array(r, reflections)
          opts = {}
          opts[:message] = r[:message] if r[:message]
          opts[:allow_nil] = true if db.typecast_value(:boolean, r[:allow_nil])
          type = r[:validation_type].to_sym
          arg = r[:argument]
          column = r[:column]

          case type
          when :like, :ilike
            arg = constraint_validation_like_to_regexp(arg, type == :ilike)
            type = :format
          when :exact_length, :min_length, :max_length
            arg = arg.to_i
          when :length_range
            arg = constraint_validation_int_range(arg)
          when :format
            arg = Regexp.new(arg)
          when :iformat
            arg = Regexp.new(arg, Regexp::IGNORECASE)
            type = :format
          when :includes_str_array
            arg = arg.split(',')
            type = :includes
          when :includes_int_array
            arg = arg.split(',').map(&:to_i)
            type = :includes
          when :includes_int_range
            arg = constraint_validation_int_range(arg)
            type = :includes
          when *OPERATOR_MAP.keys
            arg = arg.to_i if type.to_s =~ /\Aint_/
            operator = OPERATOR_MAP[type]
            type = :operator
          end

          column = if type == :unique
            column.split(',').map(&:to_sym)
          else
            column.to_sym
          end

          if type_opts = @constraint_validation_options[type]
            opts.merge!(type_opts)
          end

          reflection_opts = opts.dup
          a = [:"validates_#{type}"]

          if operator
            a << operator
            reflection_opts[:operator] = operator
          end

          if arg
            a << arg
            reflection_opts[:argument] = arg
          end 

          a << column
          unless opts.empty?
            a << opts
          end

          if column.is_a?(Array) && column.length == 1
            column = column.first
          end
          (reflections[column] ||= []) << [type, reflection_opts]

          a
        end

        # Return a range of integers assuming the argument is in
        # 1..2 or 1...2 format.
        def constraint_validation_int_range(arg)
          arg =~ /(\d+)\.\.(\.)?(\d+)/
          Range.new($1.to_i, $3.to_i, $2 == '.')
        end

        # Transform the LIKE pattern string argument into a
        # Regexp argument suitable for use with validates_format.
        def constraint_validation_like_to_regexp(arg, case_insensitive)
          arg = Regexp.escape(arg).gsub(/%%|%|_/) do |s|
            case s
            when '%%'
              '%'
            when '%'
              '.*'
            when '_'
              '.'
            end
          end
          arg = "\\A#{arg}\\z"

          if case_insensitive
            Regexp.new(arg, Regexp::IGNORECASE)
          else
            Regexp.new(arg)
          end
        end
      end

      module InstanceMethods
        # Run all of the constraint validations parsed from the database
        # when validating the instance.
        def validate
          super
          model.constraint_validations.each do |v|
            # Allow calling private validation methods
            send(*v)
          end
        end
      end
    end
  end
end
