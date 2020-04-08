# frozen-string-literal: true

module Sequel
  class Dataset
    # ---------------------
    # :section: 4 - Methods that describe what the dataset supports
    # These methods all return booleans, with most describing whether or not the
    # dataset supports a feature.
    # ---------------------
    
    # Whether this dataset quotes identifiers.
    def quote_identifiers?
      @opts.fetch(:quote_identifiers, true)
    end
    
    # Whether this dataset will provide accurate number of rows matched for
    # delete and update statements, true by default.  Accurate in this case is the number of
    # rows matched by the dataset's filter.
    def provides_accurate_rows_matched?
      true
    end
    
    # Whether you must use a column alias list for recursive CTEs, false by default.
    def recursive_cte_requires_column_aliases?
      false
    end

    # Whether the dataset requires SQL standard datetimes. False by default,
    # as most allow strings with ISO 8601 format.
    def requires_sql_standard_datetimes?
      false
    end

    # Whether type specifiers are required for prepared statement/bound
    # variable argument placeholders (i.e. :bv__integer), false by default.
    def requires_placeholder_type_specifiers?
      false
    end

    # Whether the dataset supports common table expressions, false by default.
    # If given, +type+ can be :select, :insert, :update, or :delete, in which case it
    # determines whether WITH is supported for the respective statement type.
    def supports_cte?(type=:select)
      false
    end

    # Whether the dataset supports common table expressions in subqueries, false by default.
    # If false, applies the WITH clause to the main query, which can cause issues
    # if multiple WITH clauses use the same name.
    def supports_cte_in_subqueries?
      false
    end

    # Whether the database supports derived column lists (e.g.
    # "table_expr AS table_alias(column_alias1, column_alias2, ...)"), true by
    # default.
    def supports_derived_column_lists?
      true
    end

    # Whether the dataset supports or can emulate the DISTINCT ON clause, false by default.
    def supports_distinct_on?
      false
    end

    # Whether the dataset supports CUBE with GROUP BY, false by default.
    def supports_group_cube?
      false
    end

    # Whether the dataset supports ROLLUP with GROUP BY, false by default.
    def supports_group_rollup?
      false
    end

    # Whether the dataset supports GROUPING SETS with GROUP BY, false by default.
    def supports_grouping_sets?
      false
    end

    # Whether this dataset supports the +insert_select+ method for returning all columns values
    # directly from an insert query, false by default.
    def supports_insert_select?
      supports_returning?(:insert)
    end

    # Whether the dataset supports the INTERSECT and EXCEPT compound operations, true by default.
    def supports_intersect_except?
      true
    end

    # Whether the dataset supports the INTERSECT ALL and EXCEPT ALL compound operations, true by default.
    def supports_intersect_except_all?
      true
    end

    # Whether the dataset supports the IS TRUE syntax, true by default.
    def supports_is_true?
      true
    end
    
    # Whether the dataset supports the JOIN table USING (column1, ...) syntax, true by default.
    # If false, support is emulated using JOIN table ON (table.column1 = other_table.column1).
    def supports_join_using?
      true
    end
    
    # Whether the dataset supports LATERAL for subqueries in the FROM or JOIN clauses, false by default.
    def supports_lateral_subqueries?
      false
    end

    # Whether limits are supported in correlated subqueries, true by default.
    def supports_limits_in_correlated_subqueries?
      true
    end
    
    # Whether the dataset supports skipping raising an error instead of waiting for locked rows when returning data, false by default.
    def supports_nowait?
      false
    end

    # Whether modifying joined datasets is supported, false by default.
    def supports_modifying_joins?
      false
    end
    
    # Whether the IN/NOT IN operators support multiple columns when an
    # array of values is given, true by default.
    def supports_multiple_column_in?
      true
    end

    # Whether offsets are supported in correlated subqueries, true by default.
    def supports_offsets_in_correlated_subqueries?
      true
    end

    # Whether the dataset supports or can fully emulate the DISTINCT ON clause,
    # including respecting the ORDER BY clause, false by default.
    def supports_ordered_distinct_on?
      supports_distinct_on?
    end
    
    # Whether the dataset supports pattern matching by regular expressions, false by default.
    def supports_regexp?
      false
    end

    # Whether the dataset supports REPLACE syntax, false by default.
    def supports_replace?
      false
    end

    # Whether the RETURNING clause is supported for the given type of query, false by default.
    # +type+ can be :insert, :update, or :delete.
    def supports_returning?(type)
      false
    end

    # Whether the dataset supports skipping locked rows when returning data, false by default.
    def supports_skip_locked?
      false
    end

    # Whether the database supports <tt>SELECT *, column FROM table</tt>, true by default.
    def supports_select_all_and_column?
      true
    end

    # Whether the dataset supports timezones in literal timestamps, false by default.
    def supports_timestamp_timezones?
      false
    end
    
    # Whether the dataset supports fractional seconds in literal timestamps, true by default.
    def supports_timestamp_usecs?
      true
    end
    
    # Whether the dataset supports the WINDOW clause to define windows used by multiple
    # window functions, false by default.
    def supports_window_clause?
      false
    end

    # Whether the dataset supports window functions, false by default.
    def supports_window_functions?
      false
    end
    
    # Whether the dataset supports the given window function option.  True by default.
    # This should only be called if supports_window_functions? is true. Possible options
    # are :rows, :range, :groups, :offset, :exclude.
    def supports_window_function_frame_option?(option)
      case option
      when :rows, :range, :offset
        true
      else
        false
      end
    end
    
    # Whether the dataset supports WHERE TRUE (or WHERE 1 for databases that
    # that use 1 for true), true by default.
    def supports_where_true?
      true
    end

    private

    # Whether insert(nil) or insert({}) must be emulated by
    # using at least one value.
    def insert_supports_empty_values?
      true
    end

    # Whether the dataset needs ESCAPE for LIKE for correct behavior.
    def requires_like_escape?
      true
    end

    # Whether ORDER BY col NULLS FIRST/LAST must be emulated.
    def requires_emulating_nulls_first?
      false
    end

    # Whether common table expressions are supported in UNION/INTERSECT/EXCEPT clauses.
    def supports_cte_in_compounds?
      supports_cte_in_subqueries?
    end

    # Whether the dataset supports the FILTER clause for aggregate functions.
    # If not, support is emulated using CASE.
    def supports_filtered_aggregates?
      false
    end

    # Whether the database supports quoting function names.
    def supports_quoted_function_names?
      false
    end

    # Whether the RETURNING clause is used for the given dataset.
    # +type+ can be :insert, :update, or :delete.
    def uses_returning?(type)
      opts[:returning] && !@opts[:sql] && supports_returning?(type)
    end
    
    # Whether the dataset uses WITH ROLLUP/CUBE instead of ROLLUP()/CUBE().
    def uses_with_rollup?
      false
    end
  end
end
