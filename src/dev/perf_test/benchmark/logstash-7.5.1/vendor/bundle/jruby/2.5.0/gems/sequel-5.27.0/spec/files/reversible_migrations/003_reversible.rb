Sequel.migration do
  change do
    rename_column :a, :b, :c
  end
end
