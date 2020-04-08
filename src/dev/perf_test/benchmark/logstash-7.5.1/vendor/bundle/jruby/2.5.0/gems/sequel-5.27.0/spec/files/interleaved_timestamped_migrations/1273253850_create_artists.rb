class CreateArtists < Sequel::Migration
  def up
    create_table(:sm1122){Integer :smc12}
  end
  
  def down
    drop_table(:sm1122)
  end
end
