# frozen-string-literal: true
#
# The duplicate_columns_handler extension allows you to customize handling of
# duplicate column names in your queries on a per-database or per-dataset level.
#
# For example, you may want to raise an exception if you join 2 tables together
# which contains a column that will override another columns.
#
# To use the extension, you need to load the extension into the database:
#
#   DB.extension :duplicate_columns_handler
#
# or into individual datasets:
#
#   ds = DB[:items].extension(:duplicate_columns_handler)
#
# A database option is introduced: :on_duplicate_columns. It accepts a Symbol
# or any object that responds to :call.
#
#   on_duplicate_columns: :raise
#   on_duplicate_columns: :warn
#   on_duplicate_columns: :ignore
#   on_duplicate_columns: lambda{|columns| arbitrary_condition? ? :raise : :warn}
#
# You may also configure duplicate columns handling for a specific dataset:
#
#   ds.on_duplicate_columns(:warn)
#   ds.on_duplicate_columns(:raise)
#   ds.on_duplicate_columns(:ignore)
#   ds.on_duplicate_columns{|columns| arbitrary_condition? ? :raise : :warn}
#   ds.on_duplicate_columns(lambda{|columns| arbitrary_condition? ? :raise : :warn})
#
# If :raise is specified, a Sequel::DuplicateColumnError is raised.
# If :warn is specified, you will receive a warning via +warn+.
# If a callable is specified, it will be called.
# If no on_duplicate_columns is specified, the default is :warn.
#
# Related module: Sequel::DuplicateColumnsHandler

module Sequel
  module DuplicateColumnsHandler
    CALLER_ARGS = (RUBY_VERSION >= '2.0' ? [0,1] : [0]).freeze

    # Customize handling of duplicate columns for this dataset.
    def on_duplicate_columns(handler = (raise Error, "Must provide either an argument or a block to on_duplicate_columns" unless block_given?; nil), &block)
      raise Error, "Cannot provide both an argument and a block to on_duplicate_columns" if handler && block
      clone(:on_duplicate_columns=>handler||block)
    end

    private

    # Call handle_duplicate_columns if there are duplicate columns.
    def columns=(cols)
      if cols && cols.uniq.size != cols.size
        handle_duplicate_columns(cols)
      end
      super
    end

    # Invoke the appropriate behavior when duplicate columns are present.
    def handle_duplicate_columns(cols)
      message = "#{caller(*CALLER_ARGS).first}: One or more duplicate columns present in #{cols.inspect}"

      case duplicate_columns_handler_type(cols)
      when :raise
        raise DuplicateColumnError, message
      when :warn
        warn message
      end
    end

    # Try to find dataset option for on_duplicate_columns. If not present on the dataset,
    # use the on_duplicate_columns option on the database. If not present on the database,
    # default to :warn.
    def duplicate_columns_handler_type(cols)
      handler = opts.fetch(:on_duplicate_columns){db.opts.fetch(:on_duplicate_columns, :warn)}

      if handler.respond_to?(:call)
        handler.call(cols)
      else
        handler
      end
    end
  end

  # Error which is raised when duplicate columns are present in a dataset which is configured
  # to :raise on_duplicate_columns.
  class DuplicateColumnError < Error
  end

  Dataset.register_extension(:duplicate_columns_handler, Sequel::DuplicateColumnsHandler)
end
