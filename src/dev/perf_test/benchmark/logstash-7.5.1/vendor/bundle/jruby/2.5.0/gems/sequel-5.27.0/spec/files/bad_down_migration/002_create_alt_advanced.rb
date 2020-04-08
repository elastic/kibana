Sequel.migration do
  up{create_table(:sm22222){Integer :smc2}}
  down{drop_table(:sm22222)}
end
