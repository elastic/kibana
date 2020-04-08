Sequel.migration do
  up{create_table(:sm3333){Integer :smc3}}
  down{drop_table(:sm3333)}
end
