Sequel.migration do
  no_transaction
  change{create_table(:sm){Integer :smc1}}
end
