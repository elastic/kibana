Sequel.migration do
  change do
    create_table(:d) do
      primary_key :id
    end
    alter_table(:b) do
      add_foreign_key :g, :d, :foreign_key_constraint_name=>:b_f_foo
    end
  end
end
