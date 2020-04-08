# frozen-string-literal: true
#
# The mssql_emulate_lateral_with_apply extension converts
# queries that use LATERAL into queries that use CROSS/OUTER
# APPLY, allowing code that works on databases that support
# LATERAL via Dataset#lateral to run on Microsoft SQL Server
# and Sybase SQLAnywhere.
#
# This is available as a separate extension instead of
# integrated into the Microsoft SQL Server and Sybase
# SQLAnywhere support because few people need it and there
# is a performance hit to code that doesn't use it.
#
# It is possible there are cases where this emulation does
# not work.  Users should probably verify that correct
# results are returned when using this extension.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:mssql_emulate_lateral_with_apply)
#
# Or you can load it into all of a database's datasets:
#
#   DB.extension(:mssql_emulate_lateral_with_apply)
#
# Related module: Sequel::MSSQL::EmulateLateralWithApply

#
module Sequel
  module MSSQL
    module EmulateLateralWithApply
      # If the table is a dataset that uses LATERAL,
      # convert it to a CROSS APPLY if it is a INNER
      # or CROSS JOIN, and an OUTER APPLY if it is a
      # LEFT JOIN.
      def join_table(type, table, expr=nil, *)
        if table.is_a?(Dataset) && table.opts[:lateral]
          table = table.clone(:lateral=>nil)
          case type
          when :inner
            type = :cross_apply
            table = table.where(expr)
            expr = nil
          when :cross
            type = :cross_apply
          when :left, :left_outer
            type = :outer_apply
            table = table.where(expr)
            expr = nil
          end
        end
        super
      end

      # When a FROM entry uses a LATERAL subquery,
      # convert that entry into a CROSS APPLY.
      def from(*source, &block)
        virtual_row_columns(source, block)
        lateral, source = source.partition{|t| t.is_a?(Sequel::Dataset) && t.opts[:lateral] || (t.is_a?(Sequel::SQL::AliasedExpression) && t.expression.is_a?(Sequel::Dataset) && t.expression.opts[:lateral])} unless source.empty?
        return super(*source, &nil) if !lateral || lateral.empty?

        ds = from(*source)
        lateral.each do |l|
          l = if l.is_a?(Sequel::SQL::AliasedExpression)
            l.expression.clone(:lateral=>nil).as(l.alias)
          else
            l.clone(:lateral=>nil)
          end
          ds = ds.cross_apply(l)
        end
        ds
      end
      
      # MSSQL can emulate lateral subqueries via CROSS/OUTER APPLY
      # when using this extension.
      def supports_lateral_subqueries?
        true
      end
    end
  end

  Dataset.register_extension(:mssql_emulate_lateral_with_apply, MSSQL::EmulateLateralWithApply)
end
