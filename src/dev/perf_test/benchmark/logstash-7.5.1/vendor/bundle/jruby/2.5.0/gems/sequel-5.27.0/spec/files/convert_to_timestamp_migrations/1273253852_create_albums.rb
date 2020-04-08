class CreateAlbums < Sequel::Migration
  def up
    create_table(:sm2233){Integer :smc23}
  end
  
  def down
    drop_table(:sm2233)
  end
end
