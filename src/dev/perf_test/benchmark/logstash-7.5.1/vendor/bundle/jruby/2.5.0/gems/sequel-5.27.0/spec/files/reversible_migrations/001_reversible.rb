Sequel.migration do
  change do
    create_table(:a){Integer :a}
  end
end
