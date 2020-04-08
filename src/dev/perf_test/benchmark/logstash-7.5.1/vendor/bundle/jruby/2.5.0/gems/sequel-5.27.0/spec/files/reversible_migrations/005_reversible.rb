Sequel.migration do
  change do
    alter_table(:b) do
      add_column :d, String
    end
    alter_table(:b) do
      rename_column :d, :e
    end
  end
end
