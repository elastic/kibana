# frozen-string-literal: true
#
# The constraint_validations extension is designed to easily create database
# constraints inside create_table and alter_table blocks.  It also adds
# relevant metadata about the constraints to a separate table, which the
# constraint_validations model plugin uses to setup automatic validations.
#
# To use this extension, you first need to load it into the database:
#
#   DB.extension(:constraint_validations)
#
# Note that you should only need to do this when modifying the constraint
# validations (i.e. when migrating).  You should probably not load this
# extension in general application code. 
#
# You also need to make sure to add the metadata table for the automatic
# validations.  By default, this table is called sequel_constraint_validations.
#
#   DB.create_constraint_validations_table
#
# This table should only be created once.  For new applications, you
# generally want to create it first, before creating any other application
# tables.
#
# Because migrations instance_exec the up and down blocks on a database,
# using this extension in a migration can be done via:
#
#   Sequel.migration do
#     up do
#       extension(:constraint_validations)
#       # ...
#     end
#     down do
#       extension(:constraint_validations)
#       # ...
#     end
#   end
#
# However, note that you cannot use change migrations with this extension,
# you need to use separate up/down migrations.
#
# The API for creating the constraints with automatic validations is
# similar to the validation_helpers model plugin API.  However,
# instead of having separate validates_* methods, it just adds a validate
# method that accepts a block to the schema generators.  Like the
# create_table and alter_table blocks, this block is instance_execed and
# offers its own DSL. Example:
#
#   DB.create_table(:table) do
#     Integer :id
#     String :name
#
#     validate do
#       presence :id
#       min_length 5, :name
#     end
#   end
#
# instance_exec is used in this case because create_table and alter_table
# already use instance_exec, so losing access to the surrounding receiver
# is not an issue.
#
# Here's a breakdown of the constraints created for each constraint validation
# method:
#
# All constraints except unique unless :allow_nil is true :: CHECK column IS NOT NULL
# presence (String column) :: CHECK trim(column) != ''
# exact_length 5 :: CHECK char_length(column) = 5
# min_length 5 :: CHECK char_length(column) >= 5
# max_length 5 :: CHECK char_length(column) <= 5
# length_range 3..5 :: CHECK char_length(column) >= 3 AND char_length(column) <= 5
# length_range 3...5 :: CHECK char_length(column) >= 3 AND char_length(column) < 5
# format /foo\\d+/ :: CHECK column ~ 'foo\\d+'
# format /foo\\d+/i :: CHECK column ~* 'foo\\d+'
# like 'foo%' :: CHECK column LIKE 'foo%' ESCAPE '\'
# ilike 'foo%' :: CHECK column ILIKE 'foo%' ESCAPE '\'
# includes ['a', 'b'] :: CHECK column IN ('a', 'b')
# includes [1, 2] :: CHECK column IN (1, 2)
# includes 3..5 :: CHECK column >= 3 AND column <= 5
# includes 3...5 :: CHECK column >= 3 AND column < 5
# operator :>, 1 :: CHECK column > 1
# operator :>=, 2 :: CHECK column >= 2
# operator :<, "M" :: CHECK column < 'M'
# operator :<=, 'K' :: CHECK column <= 'K'
# unique :: UNIQUE (column)
#
# There are some additional API differences:
#
# * Only the :message and :allow_nil options are respected.  The :allow_blank
#   and :allow_missing options are not respected.
# * A new option, :name, is respected, for providing the name of the constraint.  It is highly
#   recommended that you provide a name for all constraint validations, as
#   otherwise, it is difficult to drop the constraints later.
# * The includes validation only supports an array of strings, and array of
#   integers, and a range of integers.
# * There are like and ilike validations, which are similar to the format
#   validation but use a case sensitive or case insensitive LIKE pattern. LIKE
#   patters are very simple, so many regexp patterns cannot be expressed by
#   them, but only a couple databases (PostgreSQL and MySQL) support regexp
#   patterns.
# * The operator validation only supports >, >=, <, and <= operators, and the
#   argument must be a string or an integer.
# * When using the unique validation, column names cannot have embedded commas.
#   For similar reasons, when using an includes validation with an array of
#   strings, none of the strings in the array can have embedded commas.
# * The unique validation does not support an arbitrary number of columns.
#   For a single column, just the symbol should be used, and for an array
#   of columns, an array of symbols should be used.  There is no support
#   for creating two separate unique validations for separate columns in
#   a single call.
# * A drop method can be called with a constraint name in a alter_table
#   validate block to drop an existing constraint and the related
#   validation metadata.
# * While it is allowed to create a presence constraint with :allow_nil
#   set to true, doing so does not create a constraint unless the column
#   has String type.
#
# Note that this extension has the following issues on certain databases:
#
# * MySQL does not support check constraints (they are parsed but ignored),
#   so using this extension does not actually set up constraints on MySQL,
#   except for the unique constraint.  It can still be used on MySQL to
#   add the validation metadata so that the plugin can setup automatic
#   validations.
# * On SQLite, adding constraints to a table is not supported, so it must
#   be emulated by dropping the table and recreating it with the constraints.
#   If you want to use this plugin on SQLite with an alter_table block,
#   you should drop all constraint validation metadata using
#   <tt>drop_constraint_validations_for(:table=>'table')</tt>, and then
#   readd all constraints you want to use inside the alter table block,
#   making no other changes inside the alter_table block.
#
# Dropping a table will automatically delete all constraint validations for
# that table.  However, altering a table (e.g. to drop a column) will not
# currently make any changes to the constraint validations metadata.
#
# Related module: Sequel::ConstraintValidations

#
module Sequel
  module ConstraintValidations
    # The default table name used for the validation metadata.
    DEFAULT_CONSTRAINT_VALIDATIONS_TABLE = :sequel_constraint_validations
    OPERATORS = {:< => :lt, :<= => :lte, :> => :gt, :>= => :gte}.freeze
    REVERSE_OPERATOR_MAP = {:str_lt => :<, :str_lte => :<=, :str_gt => :>, :str_gte => :>=,
                            :int_lt => :<, :int_lte => :<=, :int_gt => :>, :int_gte => :>=}.freeze

    # Set the default validation metadata table name if it has not already
    # been set.
    def self.extended(db)
      db.constraint_validations_table ||= DEFAULT_CONSTRAINT_VALIDATIONS_TABLE
    end

    # This is the DSL class used for the validate block inside create_table and
    # alter_table.
    class Generator
      # Store the schema generator that encloses this validates block.
      def initialize(generator)
        @generator = generator
      end

      # Create constraint validation methods that don't take an argument 
      %w'presence unique'.each do |v|
        class_eval(<<-END, __FILE__, __LINE__+1)
          def #{v}(columns, opts=OPTS)
            @generator.validation({:type=>:#{v}, :columns=>Array(columns)}.merge!(opts))
          end
        END
      end

      # Create constraint validation methods that take an argument 
      %w'exact_length min_length max_length length_range format like ilike includes'.each do |v|
        class_eval(<<-END, __FILE__, __LINE__+1)
          def #{v}(arg, columns, opts=OPTS)
            @generator.validation({:type=>:#{v}, :columns=>Array(columns), :arg=>arg}.merge!(opts))
          end
        END
      end

      # Create operator validation.  The op should be either +:>+, +:>=+, +:<+, or +:<=+, and
      # the arg should be either a string or an integer.
      def operator(op, arg, columns, opts=OPTS)
        raise Error, "invalid operator (#{op}) used when creating operator validation" unless suffix = OPERATORS[op]

        prefix = case arg
        when String
          "str"
        when Integer
          "int"
        else
          raise Error, "invalid argument (#{arg.inspect}) used when creating operator validation"
        end

        @generator.validation({:type=>:"#{prefix}_#{suffix}", :columns=>Array(columns), :arg=>arg}.merge!(opts))
      end

      # Given the name of a constraint, drop that constraint from the database,
      # and remove the related validation metadata.
      def drop(constraint)
        @generator.validation({:type=>:drop, :name=>constraint})
      end

      # Alias of instance_exec for a nicer API.
      def process(&block)
        instance_exec(&block)
      end
    end

    # Additional methods for the create_table generator to support constraint validations.
    module CreateTableGeneratorMethods
      # An array of stored validation metadata, used later by the database to create
      # constraints.
      attr_reader :validations

      # Add a validation metadata hash to the stored array.
      def validation(opts)
        @validations << opts
      end

      # Call into the validate DSL for creating constraint validations.
      def validate(&block)
        Generator.new(self).process(&block)
      end
    end

    # Additional methods for the alter_table generator to support constraint validations,
    # used to give it a more similar API to the create_table generator.
    module AlterTableGeneratorMethods
      include CreateTableGeneratorMethods

      # Alias of add_constraint for similarity to create_table generator.
      def constraint(*args)
        add_constraint(*args)
      end

      # Alias of add_unique_constraint for similarity to create_table generator.
      def unique(*args)
        add_unique_constraint(*args)
      end
    end

    # The name of the table storing the validation metadata.  If modifying this
    # from the default, this should be changed directly after loading the
    # extension into the database
    attr_accessor :constraint_validations_table

    # Create the table storing the validation metadata for all of the
    # constraints created by this extension.
    def create_constraint_validations_table
      create_table(constraint_validations_table) do
        String :table, :null=>false
        String :constraint_name
        String :validation_type, :null=>false
        String :column, :null=>false
        String :argument
        String :message
        TrueClass :allow_nil
      end
    end

    # Modify the default create_table generator to include
    # the constraint validation methods.
    def create_table_generator(&block)
      super do
        extend CreateTableGeneratorMethods
        @validations = []
        instance_exec(&block) if block
      end
    end

    # Drop all constraint validations for a table if dropping the table.
    def drop_table(*names)
      names.each do |name|
        if !name.is_a?(Hash) && table_exists?(constraint_validations_table)
          drop_constraint_validations_for(:table=>name)
        end
      end
      super
    end

    # Drop the constraint validations table.
    def drop_constraint_validations_table
      drop_table(constraint_validations_table)
    end

    # Delete validation metadata for specific constraints.  At least
    # one of the following options should be specified:
    #
    # :table :: The table containing the constraint
    # :column :: The column affected by the constraint
    # :constraint :: The name of the related constraint
    #
    # The main reason for this method is when dropping tables
    # or columns.  If you have previously defined a constraint
    # validation on the table or column, you should delete the
    # related metadata when dropping the table or column.
    # For a table, this isn't a big issue, as it will just result
    # in some wasted space, but for columns, if you don't drop
    # the related metadata, it could make it impossible to save
    # rows, since a validation for a nonexistent column will be
    # created.
    def drop_constraint_validations_for(opts=OPTS)
      ds = from(constraint_validations_table)
      if table = opts[:table]
        ds = ds.where(:table=>constraint_validations_literal_table(table))
      end
      if column = opts[:column]
        ds = ds.where(:column=>column.to_s)
      end
      if constraint = opts[:constraint]
        ds = ds.where(:constraint_name=>constraint.to_s)
      end
      unless table || column || constraint
        raise Error, "must specify :table, :column, or :constraint when dropping constraint validations"
      end
      ds.delete
    end

    # Modify the default alter_table generator to include
    # the constraint validation methods.
    def alter_table_generator(&block)
      super do
        extend AlterTableGeneratorMethods
        @validations = []
        instance_exec(&block) if block
      end
    end

    private

    # After running all of the table alteration statements,
    # if there were any constraint validations, run table alteration
    # statements to create related constraints.  This is purposely
    # run after the other statements, as the presence validation
    # in alter table requires introspecting the modified model
    # schema.
    def apply_alter_table_generator(name, generator)
      super
      unless generator.validations.empty?
        gen = alter_table_generator
        process_generator_validations(name, gen, generator.validations)
        apply_alter_table(name, gen.operations)
      end
    end

    # The value of a blank string.  An empty string by default, but nil
    # on Oracle as Oracle treats the empty string as NULL.
    def blank_string_value
      if database_type == :oracle
        nil
      else
        ''
      end
    end

    # Return an unquoted literal form of the table name.
    # This allows the code to handle schema qualified tables,
    # without quoting all table names.
    def constraint_validations_literal_table(table)
      dataset.with_quote_identifiers(false).literal(table)
    end

    # Before creating the table, add constraints for all of the
    # generators validations to the generator.
    def create_table_from_generator(name, generator, options)
      unless generator.validations.empty?
        process_generator_validations(name, generator, generator.validations)
      end
      super
    end

    def constraint_validation_expression(cols, allow_nil)
      exprs = cols.map do |c|
        expr = yield c
        if allow_nil
          Sequel.|({c=>nil}, expr)
        else
          Sequel.&(Sequel.~(c=>nil), expr)
        end
      end
      Sequel.&(*exprs)
    end

    # For the given table, generator, and validations, add constraints
    # to the generator for each of the validations, as well as adding
    # validation metadata to the constraint validations table.
    def process_generator_validations(table, generator, validations)
      drop_rows = []
      rows = validations.map do |val|
        columns, arg, constraint, validation_type, message, allow_nil = val.values_at(:columns, :arg, :name, :type, :message, :allow_nil)

        case validation_type
        when :presence
          strings, non_strings = columns.partition{|c| generator_string_column?(generator, table, c)}
          if !non_strings.empty? && !allow_nil
            non_strings_expr = Sequel.&(*non_strings.map{|c| Sequel.~(c=>nil)})
          end

          unless strings.empty?
            strings_expr = constraint_validation_expression(strings, allow_nil){|c| Sequel.~(Sequel.trim(c) => blank_string_value)}
          end

          expr = if non_strings_expr && strings_expr
            Sequel.&(strings_expr, non_strings_expr)
          else
            strings_expr || non_strings_expr
          end

          if expr
            generator.constraint(constraint, expr)
          end
        when :exact_length
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| {Sequel.char_length(c) => arg}})
        when :min_length
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| Sequel.char_length(c) >= arg})
        when :max_length
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| Sequel.char_length(c) <= arg})
        when *REVERSE_OPERATOR_MAP.keys
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| Sequel.identifier(c).public_send(REVERSE_OPERATOR_MAP[validation_type], arg)})
        when :length_range
          op = arg.exclude_end? ? :< : :<=
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| (Sequel.char_length(c) >= arg.begin) & Sequel.char_length(c).public_send(op, arg.end)})
          arg = "#{arg.begin}..#{'.' if arg.exclude_end?}#{arg.end}"
        when :format
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| {c => arg}})
          if arg.casefold?
            validation_type = :iformat
          end
          arg = arg.source
        when :includes
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| {c => arg}})
          if arg.is_a?(Range)
            if arg.begin.is_a?(Integer) && arg.end.is_a?(Integer)
              validation_type = :includes_int_range
              arg = "#{arg.begin}..#{'.' if arg.exclude_end?}#{arg.end}"
            else
              raise Error, "validates includes with a range only supports integers currently, cannot handle: #{arg.inspect}"
            end
          elsif arg.is_a?(Array)
            if arg.all?{|x| x.is_a?(Integer)}
              validation_type = :includes_int_array
            elsif arg.all?{|x| x.is_a?(String)}
              validation_type = :includes_str_array
            else
              raise Error, "validates includes with an array only supports strings and integers currently, cannot handle: #{arg.inspect}"
            end
            arg = arg.join(',')
          else
            raise Error, "validates includes only supports arrays and ranges currently, cannot handle: #{arg.inspect}"
          end
        when :like, :ilike
          generator.constraint(constraint, constraint_validation_expression(columns, allow_nil){|c| Sequel.public_send(validation_type, c, arg)})
        when :unique
          generator.unique(columns, :name=>constraint)
          columns = [columns.join(',')]
        when :drop
          if generator.is_a?(Sequel::Schema::AlterTableGenerator)
            unless constraint
              raise Error, 'cannot drop a constraint validation without a constraint name'
            end
            generator.drop_constraint(constraint)
            drop_rows << [constraint_validations_literal_table(table), constraint.to_s]
            columns = []
          else
            raise Error, 'cannot drop a constraint validation in a create_table generator'
          end
        else
          raise Error, "invalid or missing validation type: #{val.inspect}"
        end

        columns.map do  |column|
          {:table=>constraint_validations_literal_table(table), :constraint_name=>(constraint.to_s if constraint), :validation_type=>validation_type.to_s, :column=>column.to_s, :argument=>(arg.to_s if arg), :message=>(message.to_s if message), :allow_nil=>allow_nil}
        end
      end

      ds = from(constraint_validations_table)
      unless drop_rows.empty?
        ds.where([:table, :constraint_name]=>drop_rows).delete
      end
      ds.multi_insert(rows.flatten)
    end

    # Introspect the generator to determine if column
    # created is a string or not.
    def generator_string_column?(generator, table, c)
      if generator.is_a?(Sequel::Schema::AlterTableGenerator)
        # This is the alter table case, which runs after the
        # table has been altered, so just check the database
        # schema for the column.
        schema(table).each do |col, sch|
          if col == c
            return sch[:type] == :string
          end
        end
        false
      else
        # This is the create table case, check the metadata
        # for the column to be created to see if it is a string.
        generator.columns.each do |col|
          if col[:name] == c
            return [String, :text, :varchar].include?(col[:type])
          end
        end
        false
      end
    end
  end

  Database.register_extension(:constraint_validations, ConstraintValidations)
end
