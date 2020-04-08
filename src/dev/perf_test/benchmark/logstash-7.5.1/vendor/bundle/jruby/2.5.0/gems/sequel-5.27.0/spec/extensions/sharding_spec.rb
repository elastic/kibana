require_relative "spec_helper"

describe "sharding plugin" do
  before do
    @db = Sequel.mock(:numrows=>1, :autoid=>proc{1}, :servers=>{:s1=>{}, :s2=>{}, :s3=>{}, :s4=>{}})
    @Artist = Class.new(Sequel::Model(@db[:artists].with_fetch(:id=>2, :name=>'YJM')))
    @Artist.class_eval do
      columns :id, :name
      plugin :sharding
    end
    @Album = Class.new(Sequel::Model(@db[:albums].with_fetch(:id=>1, :name=>'RF', :artist_id=>2)))
    @Album.class_eval do
      columns :id, :artist_id, :name
      plugin :sharding
    end
    @Tag = Class.new(Sequel::Model(@db[:tags].with_fetch(:id=>3, :name=>'M')))
    @Tag.class_eval do
      columns :id, :name
      plugin :sharding
    end
    @Artist.one_to_many :albums, :class=>@Album, :key=>:artist_id
    @Album.many_to_one :artist, :class=>@Artist
    @Album.many_to_many :tags, :class=>@Tag, :left_key=>:album_id, :right_key=>:tag_id, :join_table=>:albums_tags
    @db.sqls
  end 

  it "should allow you to instantiate a new object for a specified shard" do
    @Album.new_using_server(:s1, :name=>'RF').save
    @db.sqls.must_equal ["INSERT INTO albums (name) VALUES ('RF') -- s1", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s1"]
    
    @Album.new_using_server(:s2){|o| o.name = 'MO'}.save
    @db.sqls.must_equal ["INSERT INTO albums (name) VALUES ('MO') -- s2", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s2"]
  end 

  it "should allow you to create and save a new object for a specified shard" do
    @Album.create_using_server(:s1, :name=>'RF')
    @db.sqls.must_equal ["INSERT INTO albums (name) VALUES ('RF') -- s1", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s1"]

    @Album.create_using_server(:s2){|o| o.name = 'MO'}
    @db.sqls.must_equal ["INSERT INTO albums (name) VALUES ('MO') -- s2", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s2"]
  end 

  it "should have objects retrieved from a specific shard update that shard" do
    @Album.server(:s1).first.update(:name=>'MO')
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "UPDATE albums SET name = 'MO' WHERE (id = 1) -- s1"]
  end 

  it "should have objects retrieved from a specific shard delete from that shard" do
    @Album.server(:s1).first.delete
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "DELETE FROM albums WHERE (id = 1) -- s1"]
  end 

  it "should have objects retrieved from a specific shard reload from that shard" do
    @Album.server(:s1).first.reload
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s1"]
  end 

  it "should use current dataset's shard when eager loading if eagerly loaded dataset doesn't have its own shard" do
    albums = @Album.server(:s1).eager(:artist).all
    @db.sqls.must_equal ["SELECT * FROM albums -- s1", "SELECT * FROM artists WHERE (artists.id IN (2)) -- s1"]
    albums.length.must_equal 1
    albums.first.artist.save
    @db.sqls.must_equal ["UPDATE artists SET name = 'YJM' WHERE (id = 2) -- s1"]
  end 

  it "should not use current dataset's shard when eager loading if eagerly loaded dataset has its own shard" do
    @Artist.dataset = @Artist.dataset.server(:s2)
    albums = @Album.server(:s1).eager(:artist).all
    @db.sqls.must_equal ["SELECT * FROM albums -- s1", "SELECT * FROM artists WHERE (artists.id IN (2)) -- s2"]
    albums.length.must_equal 1
    albums.first.artist.save
    @db.sqls.must_equal ["UPDATE artists SET name = 'YJM' WHERE (id = 2) -- s2"]
  end 

  it "should use current dataset's shard when eager graphing if eagerly graphed dataset doesn't have its own shard" do
    albums = @Album.server(:s1).eager_graph(:artist).with_fetch(:id=>1, :artist_id=>2, :name=>'RF', :artist_id_0=>2, :artist_name=>'YJM').all
    @db.sqls.must_equal ["SELECT albums.id, albums.artist_id, albums.name, artist.id AS artist_id_0, artist.name AS artist_name FROM albums LEFT OUTER JOIN artists AS artist ON (artist.id = albums.artist_id) -- s1"]
    albums.length.must_equal 1
    albums.first.artist.save
    @db.sqls.must_equal ["UPDATE artists SET name = 'YJM' WHERE (id = 2) -- s1"]
  end 

  it "should not use current dataset's shard when eager graphing if eagerly graphed dataset has its own shard" do
    @Artist.dataset = @Artist.dataset.server(:s2)
    albums = @Album.server(:s1).eager_graph(:artist).with_fetch(:id=>1, :artist_id=>2, :name=>'RF', :artist_id_0=>2, :artist_name=>'YJM').all
    @db.sqls.must_equal ["SELECT albums.id, albums.artist_id, albums.name, artist.id AS artist_id_0, artist.name AS artist_name FROM albums LEFT OUTER JOIN artists AS artist ON (artist.id = albums.artist_id) -- s1"]
    albums.length.must_equal 1
    albums.first.artist.save
    @db.sqls.must_equal ["UPDATE artists SET name = 'YJM' WHERE (id = 2) -- s2"]
  end 

  it "should use eagerly graphed dataset shard for eagerly graphed objects even if current dataset does not have a shard" do
    @Artist.dataset = @Artist.dataset.server(:s2)
    albums = @Album.eager_graph(:artist).with_fetch(:id=>1, :artist_id=>2, :name=>'RF', :artist_id_0=>2, :artist_name=>'YJM').all
    @db.sqls.must_equal ["SELECT albums.id, albums.artist_id, albums.name, artist.id AS artist_id_0, artist.name AS artist_name FROM albums LEFT OUTER JOIN artists AS artist ON (artist.id = albums.artist_id)"]
    albums.length.must_equal 1
    albums.first.artist.save
    @db.sqls.must_equal ["UPDATE artists SET name = 'YJM' WHERE (id = 2) -- s2"]
  end 

  it "should have objects retrieved from a specific shard use associated objects from that shard, with modifications to the associated objects using that shard" do
    album = @Album.server(:s1).first
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1"]
    album.artist.update(:name=>'AS')
    @db.sqls.must_equal ["SELECT * FROM artists WHERE (artists.id = 2) LIMIT 1 -- s1", "UPDATE artists SET name = 'AS' WHERE (id = 2) -- s1"]
    album.tags.map{|a| a.update(:name=>'SR')}
    @db.sqls.must_equal ["SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (albums_tags.album_id = 1) -- s1", "UPDATE tags SET name = 'SR' WHERE (id = 3) -- s1"]
    @Artist.server(:s2).first.albums.map{|a| a.update(:name=>'MO')}
    @db.sqls.must_equal ["SELECT * FROM artists LIMIT 1 -- s2", "SELECT * FROM albums WHERE (albums.artist_id = 2) -- s2", "UPDATE albums SET name = 'MO' WHERE (id = 1) -- s2"]
  end 

  it "should have objects retrieved from a specific shard add associated objects to that shard" do
    album = @Album.server(:s1).first
    artist = @Artist.server(:s2).first
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM artists LIMIT 1 -- s2"]

    artist.add_album(:name=>'MO')
    sqls = @db.sqls
    ["INSERT INTO albums (artist_id, name) VALUES (2, 'MO') -- s2", "INSERT INTO albums (name, artist_id) VALUES ('MO', 2) -- s2"].must_include(sqls.shift)
    sqls.must_equal ["SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s2"]
    
    album.add_tag(:name=>'SR')
    sqls = @db.sqls
    ["INSERT INTO albums_tags (album_id, tag_id) VALUES (1, 3) -- s1", "INSERT INTO albums_tags (tag_id, album_id) VALUES (3, 1) -- s1"].must_include(sqls.pop)
    sqls.must_equal ["INSERT INTO tags (name) VALUES ('SR') -- s1", "SELECT * FROM tags WHERE (id = 1) LIMIT 1 -- s1", ]
  end 

  it "should have objects retrieved from a specific shard remove associated objects from that shard" do
    album = @Album.server(:s1).first
    artist = @Artist.server(:s2).first
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM artists LIMIT 1 -- s2"]

    artist.remove_album(1)
    sqls = @db.sqls
    ["UPDATE albums SET artist_id = NULL, name = 'RF' WHERE (id = 1) -- s2", "UPDATE albums SET name = 'RF', artist_id = NULL WHERE (id = 1) -- s2"].must_include(sqls.pop)
    sqls.must_equal ["SELECT * FROM albums WHERE ((albums.artist_id = 2) AND (albums.id = 1)) LIMIT 1 -- s2"]
    
    album.remove_tag(3)
    @db.sqls.must_equal ["SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id = 1) AND (tags.id = 3)) LIMIT 1 -- s1", "DELETE FROM albums_tags WHERE ((album_id = 1) AND (tag_id = 3)) -- s1"]
  end 

  it "should have objects retrieved from a specific shard remove all associated objects from that shard" do
    album = @Album.server(:s1).first
    artist = @Artist.server(:s2).first
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM artists LIMIT 1 -- s2"]

    artist.remove_all_albums
    @db.sqls.must_equal ["UPDATE albums SET artist_id = NULL WHERE (artist_id = 2) -- s2"]
    
    album.remove_all_tags
    @db.sqls.must_equal ["DELETE FROM albums_tags WHERE (album_id = 1) -- s1"]
  end 

  it "should not override a server already set on an associated object" do
    @Album.server(:s1).first
    artist = @Artist.server(:s2).first
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM artists LIMIT 1 -- s2"]

    artist.add_album(@Album.load(:id=>4, :name=>'MO').set_server(:s3))
    ["UPDATE albums SET artist_id = 2, name = 'MO' WHERE (id = 4) -- s3", "UPDATE albums SET name = 'MO', artist_id = 2 WHERE (id = 4) -- s3"].must_include(@db.sqls.pop)

    artist.remove_album(@Album.load(:id=>5, :name=>'T', :artist_id=>2).set_server(:s4))
    # Should select from current object's shard to check existing association, but update associated object's shard
    sqls = @db.sqls
    ["UPDATE albums SET artist_id = NULL, name = 'T' WHERE (id = 5) -- s4", "UPDATE albums SET name = 'T', artist_id = NULL WHERE (id = 5) -- s4"].must_include(sqls.pop)
    sqls.must_equal ["SELECT 1 AS one FROM albums WHERE ((albums.artist_id = 2) AND (id = 5)) LIMIT 1 -- s2"]
  end 

  it "should be able to set a shard to use for any object using set_server" do
    @Album.server(:s1).first.set_server(:s2).reload
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "SELECT * FROM albums WHERE (id = 1) LIMIT 1 -- s2"]
  end 

  it "should use transactions on the correct shard" do
    @Album.use_transactions = true
    @Album.server(:s2).first.save
    sqls = @db.sqls
    ["UPDATE albums SET artist_id = 2, name = 'RF' WHERE (id = 1) -- s2", "UPDATE albums SET name = 'RF', artist_id = 2 WHERE (id = 1) -- s2"].must_include(sqls.slice!(2))
    sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s2", "BEGIN -- s2", "COMMIT -- s2"]
  end 

  it "should use override current shard when saving with given :server option" do
    @Album.use_transactions = true
    @Album.server(:s2).first.save(:server=>:s1)
    sqls = @db.sqls
    ["UPDATE albums SET artist_id = 2, name = 'RF' WHERE (id = 1) -- s1", "UPDATE albums SET name = 'RF', artist_id = 2 WHERE (id = 1) -- s1"].must_include(sqls.slice!(2))
    sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s2", "BEGIN -- s1", "COMMIT -- s1"]
  end 

  it "should have objects retrieved from a specific shard using with_server from server_block extension" do
    album = @db.extension(:server_block).with_server(:s1) do
      @Album.first
    end
    album.update(:name=>'MO')
    @db.sqls.must_equal ["SELECT * FROM albums LIMIT 1 -- s1", "UPDATE albums SET name = 'MO' WHERE (id = 1) -- s1"]
  end 
end
