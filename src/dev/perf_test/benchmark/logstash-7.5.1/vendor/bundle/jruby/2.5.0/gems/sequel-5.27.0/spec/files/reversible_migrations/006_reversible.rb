Sequel.migration do
  change do
    create_table(:c) do
      primary_key :id
    end
    alter_table(:b) do
      add_foreign_key :f, :c
    end
  end
end
