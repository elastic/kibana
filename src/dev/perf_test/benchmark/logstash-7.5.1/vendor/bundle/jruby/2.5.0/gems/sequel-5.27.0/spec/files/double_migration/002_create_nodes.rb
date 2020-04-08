Class.new(Sequel::Migration) do
  def up
    create_table(:sm2222){Integer :smc2}
  end
    
  def down
    drop_table(:sm2222)
  end
end

Class.new(Sequel::Migration) do
  def up
    create_table(:sm2443){Integer :smc2}
  end
    
  def down
    drop_table(:sm2443)
  end
end
