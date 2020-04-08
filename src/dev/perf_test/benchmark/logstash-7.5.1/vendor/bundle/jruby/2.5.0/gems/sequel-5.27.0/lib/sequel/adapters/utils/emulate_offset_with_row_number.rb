# frozen-string-literal: true

module Sequel
  module EmulateOffsetWithRowNumber
    # If the offset must be emulated with ROW_NUMBER, don't remove any ordering,
    # because it can cause invalid queries to be issued if an offset is required
    # when ordering.
    def empty?
      return super unless emulate_offset_with_row_number?
      select(Dataset::EMPTY_SELECT).limit(1).single_value!.nil?
    end

    # Emulate OFFSET support with the ROW_NUMBER window function
    # 
    # The implementation is ugly, cloning the current dataset and modifying
    # the clone to add a ROW_NUMBER window function (and some other things),
    # then using the modified clone in a subselect which is selected from.
    #
    # If offset is used, an order must be provided, because the use of ROW_NUMBER
    # requires an order.
    def select_sql
      return super unless emulate_offset_with_row_number?

      offset = @opts[:offset]
      order = @opts[:order]
      if require_offset_order?
        order ||= default_offset_order
        if order.nil? || order.empty?
          raise(Error, "#{db.database_type} requires an order be provided if using an offset")
        end
      end

      columns = clone(:append_sql=>String.new, :placeholder_literal_null=>true).columns
      dsa1 = dataset_alias(1)
      rn = row_number_column
      sql = @opts[:append_sql] || String.new
      subselect_sql_append(sql, unlimited.
        unordered.
        select_append(Sequel.function(:ROW_NUMBER).over(:order=>order).as(rn)).
        from_self(:alias=>dsa1).
        select(*columns).
        limit(@opts[:limit]).
        where(SQL::Identifier.new(rn) > offset).
        order(rn))
      sql
    end

    # This does not support offsets in correlated subqueries, as it requires a query to get
    # the columns that will be invalid if a correlated subquery is used.
    def supports_offsets_in_correlated_subqueries?
      false
    end

    private

    # Allow preparing prepared statements, since determining the prepared sql to use for
    # a prepared statement requires calling prepare on that statement.
    def allow_preparing_prepared_statements?
      true
    end

    # The default order to use for datasets with offsets, if no order is defined.
    # By default, orders by all of the columns in the dataset.
    def default_offset_order
      if (cols = opts[:select])
        cols.each do |c|
          case c
          when Symbol
            return [split_alias(c).first]
          when SQL::Identifier, SQL::QualifiedIdentifier
            return [c]
          when SQL::AliasedExpression
            case c.expression
            when Symbol, SQL::Identifier, SQL::QualifiedIdentifier
              return [c.expression]
            end
          end
        end
      end
      clone(:append_sql=>String.new).columns
    end

    # Whether an order is required when using offset emulation via ROW_NUMBER, true by default.
    def require_offset_order?
      true
    end

    # Whether to use ROW_NUMBER to emulate offsets
    def emulate_offset_with_row_number?
      @opts[:offset] && !@opts[:sql]
    end
  end
end
