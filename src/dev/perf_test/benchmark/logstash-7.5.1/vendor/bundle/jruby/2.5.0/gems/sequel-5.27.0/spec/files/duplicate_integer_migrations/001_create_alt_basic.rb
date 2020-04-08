Sequel.migration do
  up{create_table(:sm11111){Integer :smc1}}
  down{drop_table(:sm11111)}
end
