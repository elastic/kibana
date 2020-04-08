require_relative "spec_helper"

describe "Touch plugin" do
  before do
    @c = Class.new(Sequel::Model)
    p = proc{def touch_instance_value; touch_association_value; end}
    @Artist = Class.new(@c, &p).set_dataset(:artists)
    @Album = Class.new(@c, &p).set_dataset(:albums)

    @Artist.columns :id, :updated_at, :modified_on
    @Artist.one_to_many :albums, :class=>@Album, :key=>:artist_id

    @Album.columns :id, :updated_at, :modified_on, :artist_id, :original_album_id
    @Album.one_to_many :followup_albums, :class=>@Album, :key=>:original_album_id
    @Album.many_to_one :artist, :class=>@Artist

    @a = @Artist.load(:id=>1)
    DB.reset
  end

  it "should default to using Time.now when setting the column values for model instances" do
    c = Class.new(Sequel::Model).set_dataset(:a)
    c.plugin :touch
    c.columns :id, :updated_at
    c.load(:id=>1).touch
    DB.sqls.first.must_match(/UPDATE a SET updated_at = '[-0-9 :.]+' WHERE \(id = 1\)/)
  end

  it "should work with current_datetime_timestamp extension" do
    c = Class.new(Sequel::Model).set_dataset(:a)
    c.dataset = c.dataset.extension(:current_datetime_timestamp)
    c.plugin :touch
    c.columns :id, :updated_at
    c.load(:id=>1).touch
    DB.sqls.must_equal ["UPDATE a SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should allow #touch instance method for updating the updated_at column" do
    @Artist.plugin :touch
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should have #touch take an argument for the column to touch" do
    @Artist.plugin :touch
    @a.touch(:modified_on)
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should be able to specify the default column to touch in the plugin call using the :column option" do
    @Artist.plugin :touch, :column=>:modified_on
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should be able to specify the default column to touch using the touch_column model accessor" do
    @Artist.plugin :touch
    @Artist.touch_column = :modified_on
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should be able to specify the associations to touch in the plugin call using the :associations option" do
    @Artist.plugin :touch, :associations=>:albums
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]
  end

  it "should clear associations after touching them  :associations option" do
    @Artist.plugin :touch, :associations=>:albums
    @a.associations[:albums] = [@Album.call(:id=>1)]
    @a.touch
    @a.associations[:albums].must_be_nil
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]
  end

  it "should be able to give an array to the :associations option specifying multiple associations" do
    @Album.plugin :touch, :associations=>[:artist, :followup_albums]
    @Album.load(:id=>4, :artist_id=>1).touch
    sqls = DB.sqls
    sqls.shift.must_equal "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 4)"
    sqls.sort.must_equal ["UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (albums.original_album_id = 4)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 1)"]
  end

  it "should be able to give a hash to the :associations option specifying the column to use for each association" do
    @Artist.plugin :touch, :associations=>{:albums=>:modified_on}
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]
  end

  it "should default to using the touch_column as the default touch column for associations" do
    @Artist.plugin :touch, :column=>:modified_on, :associations=>:albums
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]
  end

  it "should allow the mixed use of symbols and hashes inside an array for the :associations option" do
    @Album.plugin :touch, :associations=>[:artist, {:followup_albums=>:modified_on}]
    @Album.load(:id=>4, :artist_id=>1).touch
    sqls = DB.sqls
    sqls.shift.must_equal "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 4)"
    sqls.sort.must_equal ["UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.original_album_id = 4)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 1)"]
  end

  it "should be able to specify the associations to touch via a touch_associations_method" do
    @Album.plugin :touch
    @Album.touch_associations(:artist, {:followup_albums=>:modified_on})
    @Album.load(:id=>4, :artist_id=>1).touch
    sqls = DB.sqls
    sqls.shift.must_equal "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 4)"
    sqls.sort.must_equal ["UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.original_album_id = 4)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 1)"]
  end

  it "should touch associated objects when destroying an object" do
    @Album.plugin :touch
    @Album.touch_associations(:artist, {:followup_albums=>:modified_on})
    @Album.load(:id=>4, :artist_id=>1).destroy
    sqls = DB.sqls
    sqls.shift.must_equal "DELETE FROM albums WHERE id = 4"
    sqls.sort.must_equal ["UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.original_album_id = 4)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 1)"]
  end

  it "should be able to touch many_to_one associations" do
    @Album.plugin :touch, :associations=>:artist
    @Album.load(:id=>3, :artist_id=>4).touch
    DB.sqls.must_equal ["UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 3)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 4)"]
  end

  it "should be able to touch many_to_one associations" do
    @Album.plugin :touch, :associations=>:artist
    @Album.plugin :skip_create_refresh
    @Album.create(:artist_id=>4)
    DB.sqls.must_equal ["INSERT INTO albums (artist_id) VALUES (4)",
      "UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (artists.id = 4)"]
  end

  it "should be able to touch one_to_one associations" do
    @Artist.one_to_one :album, :class=>@Album, :key=>:artist_id
    @Artist.plugin :touch, :associations=>:album
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]
  end

  it "should be able to touch many_to_many associations" do
    @Artist.many_to_many :albums, :class=>@Album, :left_key=>:artist_id, :join_table=>:aa
    @Artist.plugin :touch, :associations=>:albums
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "SELECT albums.* FROM albums INNER JOIN aa ON (aa.album_id = albums.id) WHERE (aa.artist_id = 1)",
      "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should be able to touch many_through_many associations" do
    @Artist.plugin :many_through_many
    @Artist.many_through_many :albums, [[:aa, :artist_id, :album_id]], :class=>@Album
    @Artist.plugin :touch, :associations=>:albums
    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)",
      "SELECT albums.* FROM albums INNER JOIN aa ON (aa.album_id = albums.id) WHERE (aa.artist_id = 1)",
      "UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should handle touching many_to_one associations with no associated object" do
    @Album.plugin :touch, :associations=>:artist
    @Album.load(:id=>3, :artist_id=>nil).touch
    DB.sqls.must_equal ["UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE (id = 3)"]
  end

  it "should not update a column that doesn't exist" do
    @Album.plugin :touch, :column=>:x
    a = @Album.load(:id=>1)
    a.touch
    DB.sqls.must_equal []
    a.artist_id = 1
    a.touch
    DB.sqls.must_equal ['UPDATE albums SET artist_id = 1 WHERE (id = 1)']
  end

  it "should raise an error if given a column argument in touch that doesn't exist" do
    @Artist.plugin :touch
    proc{@a.touch(:x)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise an Error when a nonexistent association is given" do
    @Artist.plugin :touch
    proc{@Artist.plugin :touch, :associations=>:blah}.must_raise(Sequel::Error)
  end

  it "should work correctly in subclasses" do
    @Artist.plugin :touch
    c1 = Class.new(@Artist)
    c1.load(:id=>4).touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 4)"]

    c1.touch_column = :modified_on
    c1.touch_associations :albums
    c1.load(:id=>1).touch
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 1)",
      "UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.artist_id = 1)"]

    @a.touch
    DB.sqls.must_equal ["UPDATE artists SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]

    @Artist.plugin :touch, :column=>:modified_on, :associations=>:albums
    c2 = Class.new(@Artist)
    c2.load(:id=>4).touch
    DB.sqls.must_equal ["UPDATE artists SET modified_on = CURRENT_TIMESTAMP WHERE (id = 4)",
      "UPDATE albums SET modified_on = CURRENT_TIMESTAMP WHERE (albums.artist_id = 4)"]
  end

  it "should freeze touched associations when freezing model class" do
    @Artist.plugin :touch, :associations=>:albums
    @Artist.freeze
    @Artist.touched_associations.frozen?.must_equal true
  end
end
