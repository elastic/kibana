Sequel.migration do
  up{create_table(:sm33333){Integer :smc3}}
  down{drop_table(:sm33333)}
end
