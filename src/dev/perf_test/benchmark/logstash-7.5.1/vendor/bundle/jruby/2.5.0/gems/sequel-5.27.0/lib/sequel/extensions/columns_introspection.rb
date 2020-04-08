# frozen-string-literal: true
#
# The columns_introspection extension attempts to introspect the
# selected columns for a dataset before issuing a query.  If it
# thinks it can guess correctly at the columns the query will use,
# it will return the columns without issuing a database query.
#
# This method is not fool-proof, it's possible that some databases
# will use column names that Sequel does not expect.  Also, it
# may not correctly handle all cases. 
#
# To attempt to introspect columns for a single dataset:
#
#   ds = ds.extension(:columns_introspection)
#
# To attempt to introspect columns for all datasets on a single database:
#
#   DB.extension(:columns_introspection)
#
# Related module: Sequel::ColumnsIntrospection

#
module Sequel
  module ColumnsIntrospection
    # Attempt to guess the columns that will be returned
    # if there are columns selected, in order to skip a database
    # query to retrieve the columns.  This should work with
    # Symbols, SQL::Identifiers, SQL::QualifiedIdentifiers, and
    # SQL::AliasedExpressions.
    def columns
      if cols = _columns
        return cols
      end
      if (pcs = probable_columns) && pcs.all?
        self.columns = pcs
      else
        super
      end
    end

    protected

    # Return an array of probable column names for the dataset, or
    # nil if it is not possible to determine that through
    # introspection.
    def probable_columns
      if (cols = opts[:select]) && !cols.empty?
        cols.map{|c| probable_column_name(c)}
      elsif !opts[:join] && !opts[:with] && (from = opts[:from]) && from.length == 1 && (from = from.first)
        if from.is_a?(SQL::AliasedExpression)
          from = from.expression
        end
        
        case from
        when Dataset
          from.probable_columns
        when Symbol, SQL::Identifier, SQL::QualifiedIdentifier
          schemas = db.instance_variable_get(:@schemas)
          if schemas && (table = literal(from)) && (sch = Sequel.synchronize{schemas[table]})
            sch.map{|c,_| c}
          end
        end
      end
    end

    private

    # Return the probable name of the column, or nil if one
    # cannot be determined.
    def probable_column_name(c)
      case c
      when Symbol
        _, c, a = split_symbol(c)
        (a || c).to_sym
      when SQL::Identifier
        c.value.to_sym
      when SQL::QualifiedIdentifier
        col = c.column
        col.is_a?(SQL::Identifier) ? col.value.to_sym : col.to_sym
      when SQL::AliasedExpression
        a = c.alias
        a.is_a?(SQL::Identifier) ? a.value.to_sym : a.to_sym
      end
    end
  end

  Dataset.register_extension(:columns_introspection, Sequel::ColumnsIntrospection)
end

