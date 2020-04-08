require_relative "spec_helper"

describe "AssociationDependencies plugin" do
  before do
    @mods = []
    @c = Class.new(Sequel::Model)
    @c.plugin :association_dependencies
    @Artist = Class.new(@c).set_dataset(:artists)
    @Artist.dataset = @Artist.dataset.with_fetch(:id=>2, :name=>'Ar')
    @Album = Class.new(@c).set_dataset(:albums)
    @Album.dataset = @Album.dataset.with_fetch(:id=>1, :name=>'Al', :artist_id=>2)
    @Artist.columns :id, :name
    @Album.columns :id, :name, :artist_id
    @Artist.one_to_many :albums, :class=>@Album, :key=>:artist_id
    @Artist.one_to_one :first_album, :class=>@Album, :key=>:artist_id, :conditions=>{:position=>1}
    @Artist.many_to_many :other_artists, :class=>@Artist, :join_table=>:aoa, :left_key=>:l, :right_key=>:r
    @Album.many_to_one :artist, :class=>@Artist
    DB.reset
  end

  it "should allow destroying associated many_to_one associated object" do
    @Album.add_association_dependencies :artist=>:destroy
    @Album.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1', 'SELECT * FROM artists WHERE (artists.id = 2) LIMIT 1', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow deleting associated many_to_one associated object" do
    @Album.add_association_dependencies :artist=>:delete
    @Album.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1', 'DELETE FROM artists WHERE (artists.id = 2)']
  end
  
  it "should allow destroying associated one_to_one associated object" do
    @Artist.add_association_dependencies :first_album=>:destroy
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['SELECT * FROM albums WHERE ((position = 1) AND (albums.artist_id = 2)) LIMIT 1', 'DELETE FROM albums WHERE id = 1', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow deleting associated one_to_one associated object" do
    @Artist.add_association_dependencies :first_album=>:delete
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE ((position = 1) AND (albums.artist_id = 2))', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow destroying associated one_to_many objects" do
    @Artist.add_association_dependencies :albums=>:destroy
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['SELECT * FROM albums WHERE (albums.artist_id = 2)', 'DELETE FROM albums WHERE id = 1', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow deleting associated one_to_many objects" do
    @Artist.add_association_dependencies :albums=>:delete
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE (albums.artist_id = 2)', 'DELETE FROM artists WHERE id = 2']
  end
  
  it "should allow nullifying associated one_to_one objects" do
    @Artist.add_association_dependencies :first_album=>:nullify
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['UPDATE albums SET artist_id = NULL WHERE ((position = 1) AND (artist_id = 2))', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow nullifying associated one_to_many objects" do
    @Artist.add_association_dependencies :albums=>:nullify
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['UPDATE albums SET artist_id = NULL WHERE (artist_id = 2)', 'DELETE FROM artists WHERE id = 2']
  end

  it "should allow nullifying associated many_to_many associations" do
    @Artist.add_association_dependencies :other_artists=>:nullify
    @Artist.load(:id=>2, :name=>'Ar').destroy
    DB.sqls.must_equal ['DELETE FROM aoa WHERE (l = 2)', 'DELETE FROM artists WHERE id = 2']
  end

  it "should not allow modifications if class is frozen" do
    @Artist.add_association_dependencies :other_artists=>:nullify
    @Artist.freeze
    proc{@Artist.add_association_dependencies :albums=>:nullify}.must_raise RuntimeError, TypeError
    @Artist.association_dependencies.frozen?.must_equal true
    @Artist.association_dependencies[:before_nullify].frozen?.must_equal true
  end

  it "should raise an error if attempting to nullify a many_to_one association" do
    proc{@Album.add_association_dependencies :artist=>:nullify}.must_raise(Sequel::Error)
  end

  it "should raise an error if using an unrecognized dependence action" do
    proc{@Album.add_association_dependencies :artist=>:blah}.must_raise(Sequel::Error)
  end

  it "should raise an error if a nonexistent association is used" do
    proc{@Album.add_association_dependencies :blah=>:delete}.must_raise(Sequel::Error)
  end

  it "should raise an error if a invalid association type is used" do
    @Artist.plugin :many_through_many
    @Artist.many_through_many :other_albums, [[:id, :id, :id]]
    proc{@Artist.add_association_dependencies :other_albums=>:nullify}.must_raise(Sequel::Error)
  end

  it "should raise an error if using a many_to_many association type without nullify" do
    proc{@Artist.add_association_dependencies :other_artists=>:delete}.must_raise(Sequel::Error)
  end

  it "should allow specifying association dependencies in the plugin call" do
    @Album.plugin :association_dependencies, :artist=>:destroy
    @Album.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1', 'SELECT * FROM artists WHERE (artists.id = 2) LIMIT 1', 'DELETE FROM artists WHERE id = 2']
  end

  it "should work with subclasses" do
    c = Class.new(@Album)
    c.add_association_dependencies :artist=>:destroy
    c.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1', 'SELECT * FROM artists WHERE (artists.id = 2) LIMIT 1', 'DELETE FROM artists WHERE id = 2']

    @Album.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1']

    @Album.add_association_dependencies :artist=>:destroy
    c2 = Class.new(@Album)
    c2.load(:id=>1, :name=>'Al', :artist_id=>2).destroy
    DB.sqls.must_equal ['DELETE FROM albums WHERE id = 1', 'SELECT * FROM artists WHERE (artists.id = 2) LIMIT 1', 'DELETE FROM artists WHERE id = 2']
  end
end
