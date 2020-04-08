# frozen-string-literal: true

module Sequel::Database::SplitAlterTable
  private

  # Preprocess the array of operations.  If it looks like some operations depend
  # on results of earlier operations and may require reloading the schema to
  # work correctly, split those operations into separate lists, and between each
  # list, remove the cached schema so that the later operations deal with the
  # then current table schema.
  def apply_alter_table(name, ops)
    modified_columns = []
    op_groups = [[]]
    ops.each do |op|
      case op[:op]
      when :add_column, :set_column_type, :set_column_null, :set_column_default
        if modified_columns.include?(op[:name])
          op_groups << []
        else
          modified_columns << op[:name]
        end
      when :rename_column
        if modified_columns.include?(op[:name]) || modified_columns.include?(op[:new_name])
          op_groups << []
        end
        modified_columns << op[:name] unless modified_columns.include?(op[:name])
        modified_columns << op[:new_name] unless modified_columns.include?(op[:new_name])
      end
      if split_alter_table_op?(op)
        op_groups << []
      end
      op_groups.last << op
    end

    op_groups.each do |opgs|
      next if opgs.empty?
      alter_table_sql_list(name, opgs).each{|sql| execute_ddl(sql)}
      remove_cached_schema(name)
    end
  end

  # Whether the given alter table op should start a new group.
  def split_alter_table_op?(op)
    false
  end
end
