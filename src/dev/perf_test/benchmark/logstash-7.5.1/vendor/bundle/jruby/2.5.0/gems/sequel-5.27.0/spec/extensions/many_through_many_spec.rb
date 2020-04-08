require_relative "spec_helper"

describe Sequel::Model, "many_through_many" do
  before do
    class ::Artist < Sequel::Model
      attr_accessor :yyy
      columns :id
      plugin :many_through_many
    end
    class ::Tag < Sequel::Model
      columns :id, :h1, :h2
    end
    @c1 = Artist
    @c2 = Tag
    @dataset = @c2.dataset = @c2.dataset.with_fetch(:id=>1)
    DB.reset
  end
  after do
    Object.send(:remove_const, :Artist)
    Object.send(:remove_const, :Tag)
  end

  it "should raise an error if current class does not have a primary key, and :left_primary_key is not specified" do
    @c1.no_primary_key
    proc{@c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should raise an error if associated class does not have a primary key, and :right_primary_key is not specified" do
    @c2.no_primary_key
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    proc{n.tags}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should populate :key_hash and :id_map option correctly for custom eager loaders" do
    khs = []
    pr = proc{|h| khs << [h[:key_hash], h[:id_map]]}
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_loader=>pr
    @c1.eager(:tags).all
    khs.must_equal [[{:id=>{1=>[Artist.load(:x=>1, :id=>1)]}}, {1=>[Artist.load(:x=>1, :id=>1)]}]]

    khs.clear
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:id, :left_primary_key_column=>:i, :eager_loader=>pr
    @c1.eager(:tags).all
    khs.must_equal [[{:id=>{1=>[Artist.load(:x=>1, :id=>1)]}}, {1=>[Artist.load(:x=>1, :id=>1)]}]]
  end

  it "should support using a custom :left_primary_key option when eager loading many_to_many associations" do
    @c1.send(:define_method, :id3){id*3}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>3)
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:id3
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (3))"]
    a.first.tags.must_equal [@c2.load(:id=>4)]
    DB.sqls.must_equal []
  end

  it "should handle a :predicate_key option to change the SQL used in the lookup" do
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>1)
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :predicate_key=>(Sequel[:albums_artists][:artist_id] / 3)
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, (albums_artists.artist_id / 3) AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id / 3) IN (1))"]
    a.first.tags.must_equal [@c2.load(:id=>4)]
  end
  
  it "should handle schema qualified tables" do
    @c1.many_through_many :tags, :through=>[[Sequel[:myschema][:albums_artists], :artist_id, :album_id], [Sequel[:myschema][:albums], :id, :id], [Sequel[:myschema][:albums_tags], :album_id, :tag_id]]
    @c1.load(:id=>1).tags_dataset.sql.must_equal "SELECT tags.* FROM tags INNER JOIN myschema.albums_tags ON (myschema.albums_tags.tag_id = tags.id) INNER JOIN myschema.albums ON (myschema.albums.id = myschema.albums_tags.album_id) INNER JOIN myschema.albums_artists ON (myschema.albums_artists.album_id = myschema.albums.id) WHERE (myschema.albums_artists.artist_id = 1)"

    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>1)
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, myschema.albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN myschema.albums_tags ON (myschema.albums_tags.tag_id = tags.id) INNER JOIN myschema.albums ON (myschema.albums.id = myschema.albums_tags.album_id) INNER JOIN myschema.albums_artists ON (myschema.albums_artists.album_id = myschema.albums.id) WHERE (myschema.albums_artists.artist_id IN (1))"]

    Tag.dataset.columns(:id, :h1, :h2)
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id, tags.h1, tags.h2 FROM artists LEFT OUTER JOIN myschema.albums_artists AS albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN myschema.albums AS albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN myschema.albums_tags AS albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end
  
  with_symbol_splitting "should handle schema qualified table symbols" do
    @c1.many_through_many :tags, :through=>[[:myschema__albums_artists, :artist_id, :album_id], [:myschema__albums, :id, :id], [:myschema__albums_tags, :album_id, :tag_id]]
    @c1.load(:id=>1).tags_dataset.sql.must_equal "SELECT tags.* FROM tags INNER JOIN myschema.albums_tags ON (myschema.albums_tags.tag_id = tags.id) INNER JOIN myschema.albums ON (myschema.albums.id = myschema.albums_tags.album_id) INNER JOIN myschema.albums_artists ON (myschema.albums_artists.album_id = myschema.albums.id) WHERE (myschema.albums_artists.artist_id = 1)"

    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>1)
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, myschema.albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN myschema.albums_tags ON (myschema.albums_tags.tag_id = tags.id) INNER JOIN myschema.albums ON (myschema.albums.id = myschema.albums_tags.album_id) INNER JOIN myschema.albums_artists ON (myschema.albums_artists.album_id = myschema.albums.id) WHERE (myschema.albums_artists.artist_id IN (1))"]

    Tag.dataset.columns(:id, :h1, :h2)
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id, tags.h1, tags.h2 FROM artists LEFT OUTER JOIN myschema.albums_artists AS albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN myschema.albums AS albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN myschema.albums_tags AS albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end
  
  it "should default to associating to other models in the same scope" do
    begin
      class ::AssociationModuleTest
        class Artist < Sequel::Model
          plugin :many_through_many
          many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
        end  
        class Tag < Sequel::Model
        end  
      end  
      
      ::AssociationModuleTest::Artist.association_reflection(:tags).associated_class.must_equal ::AssociationModuleTest::Tag
    ensure
      Object.send(:remove_const, :AssociationModuleTest)
    end
  end 

  it "should raise an error if in invalid form of through is used" do
    proc{@c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id]]}.must_raise(Sequel::Error)
    proc{@c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], {:table=>:album_tags, :left=>:album_id}]}.must_raise(Sequel::Error)
    proc{@c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], :album_tags]}.must_raise(Sequel::Error)
  end

  it "should allow only two arguments with the :through option" do
    @c1.many_through_many :tags, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should be clonable" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.many_through_many :other_tags, :clone=>:tags
    n = @c1.load(:id => 1234)
    n.other_tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should use join tables given" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should handle multiple aliasing of tables" do
    begin
      class ::Album < Sequel::Model
      end
      @c1.many_through_many :albums, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id], [:artists, :id, :id], [:albums_artists, :artist_id, :album_id]]
      n = @c1.load(:id => 1234)
      n.albums_dataset.sql.must_equal 'SELECT albums.* FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) INNER JOIN artists ON (artists.id = albums_artists.artist_id) INNER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) INNER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) INNER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_0.id) WHERE (albums_artists_1.artist_id = 1234)'
      n.albums.must_equal [Album.load(:id=>1, :x=>1)]
    ensure
      Object.send(:remove_const, :Album)
    end
  end

  it "should use explicit class if given" do
    @c1.many_through_many :albums_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag
    n = @c1.load(:id => 1234)
    n.albums_tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.albums_tags.must_equal [@c2.load(:id=>1)]
  end

  it "should accept :left_primary_key and :right_primary_key option for primary keys to use in current and associated table" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :right_primary_key=>:tag_id, :left_primary_key=>:yyy
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.tag_id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 85)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should handle composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1 = 1234) AND (albums_artists.b2 = 85))'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should allowing filtering by many_through_many associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many associations with a single through table" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id]]
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists WHERE ((albums_artists.album_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many associations with aliased tables" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums_artists, :id, :id], [:albums_artists, :album_id, :tag_id]]
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.id = albums_artists.album_id) INNER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_artists_0.id) WHERE ((albums_artists_1.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many associations with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tags=>@c2.load(:h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE ((albums_tags.g1 = 1234) AND (albums_tags.g2 = 85) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many associations with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by many_through_many associations with :conditions with a single through table" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_artists ON (albums_artists.album_id = tags.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by many_through_many associations with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id = 1))))"
  end

  it "should allowing filtering by many_through_many associations with :limit" do
    @c2.dataset = @c2.dataset.with_extend{def supports_window_functions?; true end}
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :limit=>10
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id IS NOT NULL) AND ((albums_artists.artist_id, tags.id) IN (SELECT b, c FROM (SELECT albums_artists.artist_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums_artists.artist_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id)) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 1234))))'
  end

  it "should allowing filtering by many_through_many associations with :limit and composite keys" do
    @c2.dataset = @c2.dataset.with_extend{def supports_window_functions?; true end}
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :limit=>10
    @c1.filter(:tags=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND ((albums_artists.b1, albums_artists.b2, tags.id) IN (SELECT b, c, d FROM (SELECT albums_artists.b1 AS b, albums_artists.b2 AS c, tags.id AS d, row_number() OVER (PARTITION BY albums_artists.b1, albums_artists.b2) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2))) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 1))))'
  end

  it "should allowing filtering by many_through_many associations with :limit and :conditions" do
    @c2.dataset = @c2.dataset.with_extend{def supports_window_functions?; true end}
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}, :limit=>10
    @c1.filter(:tags=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND ((albums_artists.artist_id, tags.id) IN (SELECT b, c FROM (SELECT albums_artists.artist_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums_artists.artist_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by many_through_many associations with :limit and :conditions and composite keys" do
    @c2.dataset = @c2.dataset.with_extend{def supports_window_functions?; true end}
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}, :limit=>10
    @c1.filter(:tags=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND ((albums_artists.b1, albums_artists.b2, tags.id) IN (SELECT b, c, d FROM (SELECT albums_artists.b1 AS b, albums_artists.b2 AS c, tags.id AS d, row_number() OVER (PARTITION BY albums_artists.b1, albums_artists.b2) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 1))))"
  end

  it "should allowing excluding by many_through_many associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tags=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by many_through_many associations with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tags=>@c2.load(:h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE ((albums_tags.g1 = 1234) AND (albums_tags.g2 = 85) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by many_through_many associations with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234)))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by many_through_many associations with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id = 1)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should allowing filtering by multiple many_through_many associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tags=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (1234, 2345)) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by multiple many_through_many associations with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tags=>[@c2.load(:h1=>1234, :h2=>85), @c2.load(:h1=>2345, :h2=>95)]).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN ((1234, 85), (2345, 95))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by multiple many_through_many associations with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (1234, 2345)))))"
  end

  it "should allowing filtering by multiple many_through_many associations with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>[@c2.load(:id=>1, :h1=>1234, :h2=>85), @c2.load(:id=>2, :h1=>2345, :h2=>95)]).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (1, 2)))))"
  end

  it "should allowing excluding by multiple many_through_many associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tags=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (1234, 2345)) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by multiple many_through_many associations with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tags=>[@c2.load(:h1=>1234, :h2=>85), @c2.load(:h1=>2345, :h2=>95)]).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN ((1234, 85), (2345, 95))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by multiple many_through_many associations with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (1234, 2345))))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by multiple many_through_many associations with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>[@c2.load(:id=>1, :h1=>1234, :h2=>85), @c2.load(:id=>2, :h1=>2345, :h2=>95)]).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (1, 2))))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should allowing filtering/excluding many_through_many associations with NULL values" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tags=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE \'f\''
    @c1.exclude(:tags=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE \'t\''
  end

  it "should allowing filtering by many_through_many association datasets" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tags=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many association datasets with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tags=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN (SELECT tags.h1, tags.h2 FROM tags WHERE ((x = 1) AND (tags.h1 IS NOT NULL) AND (tags.h2 IS NOT NULL)))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by many_through_many association datasets with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should allowing filtering by many_through_many association datasets with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tags=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should allowing excluding by many_through_many association datasets" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tags=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by many_through_many association datasets with composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tags=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN (SELECT tags.h1, tags.h2 FROM tags WHERE ((x = 1) AND (tags.h1 IS NOT NULL) AND (tags.h2 IS NOT NULL)))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by many_through_many association datasets with :conditions" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by many_through_many association datasets with :conditions and composite keys" do
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tags=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should support a :conditions option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 32) AND (albums_artists.artist_id = 1234))'
    n.tags.must_equal [@c2.load(:id=>1)]

    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>Sequel.lit('a = ?', 42)
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 42) AND (albums_artists.artist_id = 1234))'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should support an :order option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) ORDER BY blah'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should support an array for the :order option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) ORDER BY blah1, blah2'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should support a select option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>:blah
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT blah FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should support an array for the select option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>[Sequel::SQL::ColumnAll.new(:tags), Sequel[:albums][:name]]
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.*, albums.name FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end
  
  it "should accept a block" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]] do |ds| ds.filter(:yyy=>@yyy) end
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id = 1234) AND (yyy = 85))'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should allow the :order option while accepting a block" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah do |ds| ds.filter(:yyy=>@yyy) end
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id = 1234) AND (yyy = 85)) ORDER BY blah'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should support a :dataset option that is used instead of the default" do
    @c1.many_through_many :tags, [[:a, :b, :c]], :dataset=>proc{Tag.join(:albums_tags, [:tag_id]).join(:albums, [:album_id]).join(:albums_artists, [:album_id]).filter(Sequel[:albums_artists][:artist_id]=>id)}
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags USING (tag_id) INNER JOIN albums USING (album_id) INNER JOIN albums_artists USING (album_id) WHERE (albums_artists.artist_id = 1234)'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should support a :limit option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :limit=>10
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 10'
    n.tags.must_equal [@c2.load(:id=>1)]

    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :limit=>[10, 10]
    n = @c1.load(:id => 1234)
    n.tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 10 OFFSET 10'
    n.tags.must_equal [@c2.load(:id=>1)]
  end

  it "should have the :eager option affect the _dataset method" do
    @c2.many_to_many :fans
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:fans
    @c1.load(:id => 1234).tags_dataset.opts[:eager].must_equal(:fans=>nil)
  end
  
  it "should provide an array with all members of the association" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.load(:id => 1234).tags.must_equal [@c2.load(:id=>1)]
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)']
  end

  it "should populate cache when accessed" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tags].must_be_nil
    DB.sqls.must_equal []
    n.tags.must_equal [@c2.load(:id=>1)]
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)']
    n.associations[:tags].must_equal n.tags
    DB.sqls.length.must_equal 0
  end

  it "should use cache if available" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tags] = []
    n.tags.must_equal []
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tags] = []
    DB.sqls.must_equal []
    n.tags(:reload=>true).must_equal [@c2.load(:id=>1)]
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234)']
    n.associations[:tags].must_equal n.tags
    DB.sqls.length.must_equal 0
  end

  it "should not add associations methods directly to class" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    im = @c1.instance_methods
    im.must_include(:tags)
    im.must_include(:tags_dataset)
    im2 = @c1.instance_methods(false)
    im2.wont_include(:tags)
    im2.wont_include(:tags_dataset)
  end

  it "should support after_load association callback" do
    h = []
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :after_load=>:al
    @c1.class_eval do
      self::Foo = h
      def al(v)
        v.each{|x| model::Foo << x.pk * 20}
      end
    end
    @c2.dataset = @c2.dataset.with_fetch([{:id=>20}, {:id=>30}])
    p = @c1.load(:id=>10, :parent_id=>20)
    p.tags
    h.must_equal [400, 600]
    p.tags.collect{|a| a.pk}.must_equal [20, 30]
  end

  it "should support a :uniq option that removes duplicates from the association" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :uniq=>true
    @c2.dataset = @c2.dataset.with_fetch([{:id=>20}, {:id=>30}, {:id=>20}, {:id=>30}])
    @c1.load(:id=>10).tags.must_equal [@c2.load(:id=>20), @c2.load(:id=>30)]
  end
end

describe 'Sequel::Plugins::ManyThroughMany::ManyThroughManyAssociationReflection' do
  before do
    class ::Artist < Sequel::Model
      plugin :many_through_many
      many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    end
    class ::Tag < Sequel::Model
    end
    DB.reset
    @ar = Artist.association_reflection(:tags)
  end
  after do
    Object.send(:remove_const, :Artist)
    Object.send(:remove_const, :Tag)
  end
  
  it "#edges should be an array of joins to make when eager graphing" do
    @ar.edges.must_equal [{:conditions=>[], :left=>:id, :right=>:artist_id, :table=>:albums_artists, :join_type=>:left_outer, :block=>nil}, {:conditions=>[], :left=>:album_id, :right=>:id, :table=>:albums, :join_type=>:left_outer, :block=>nil}, {:conditions=>[], :left=>:id, :right=>:album_id, :table=>:albums_tags, :join_type=>:left_outer, :block=>nil}]
  end
  
  it "#edges should handle composite keys" do
    Artist.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    Artist.association_reflection(:tags).edges.must_equal [{:conditions=>[], :left=>[:id, :yyy], :right=>[:b1, :b2], :table=>:albums_artists, :join_type=>:left_outer, :block=>nil}, {:conditions=>[], :left=>[:c1, :c2], :right=>[:d1, :d2], :table=>:albums, :join_type=>:left_outer, :block=>nil}, {:conditions=>[], :left=>[:e1, :e2], :right=>[:f1, :f2], :table=>:albums_tags, :join_type=>:left_outer, :block=>nil}]
  end
  
  it "#reverse_edges should be an array of joins to make when lazy loading or eager loading" do
    @ar.reverse_edges.must_equal [{:alias=>:albums_tags, :left=>:tag_id, :right=>:id, :table=>:albums_tags}, {:alias=>:albums, :left=>:id, :right=>:album_id, :table=>:albums}]
  end
  
  it "#reverse_edges should handle composite keys" do
    Artist.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    Artist.association_reflection(:tags).reverse_edges.must_equal [{:alias=>:albums_tags, :left=>[:g1, :g2], :right=>[:h1, :h2], :table=>:albums_tags}, {:alias=>:albums, :left=>[:e1, :e2], :right=>[:f1, :f2], :table=>:albums}]
  end
  
  it "#reciprocal should be nil" do
    @ar.reciprocal.must_be_nil
  end
end

describe "many_through_many eager loading methods" do
  before do
    class ::Artist < Sequel::Model
      plugin :many_through_many
      many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
      many_through_many :other_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>:Tag
      many_through_many :albums, [[:albums_artists, :artist_id, :album_id]]
      many_through_many :artists, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id]]
    end
    class ::Tag < Sequel::Model
      plugin :many_through_many
      many_through_many :tracks, [[:albums_tags, :tag_id, :album_id], [:albums, :id, :id]], :right_primary_key=>:album_id
    end
    class ::Album < Sequel::Model
    end
    class ::Track < Sequel::Model
    end
    Artist.dataset = Artist.dataset.with_fetch(proc do |sql|
      h = {:id => 1}
      if sql =~ /FROM artists LEFT OUTER JOIN albums_artists/
        h[:tags_id] = 2
        h[:albums_0_id] = 3 if sql =~ /LEFT OUTER JOIN albums AS albums_0/
        h[:tracks_id] = 4 if sql =~ /LEFT OUTER JOIN tracks/
        h[:other_tags_id] = 9 if sql =~ /other_tags\.id AS other_tags_id/
        h[:artists_0_id] = 10 if sql =~ /artists_0\.id AS artists_0_id/
      end
      h
    end)
    Artist.dataset.columns(:id)
    
    Tag.dataset = Tag.dataset.with_fetch(proc do |sql|
      h = {:id => 2}
      if sql =~ /albums_artists.artist_id IN \(([18])\)/
        h[:x_foreign_key_x] = $1.to_i 
      elsif sql =~ /\(\(albums_artists.b1, albums_artists.b2\) IN \(\(1, 8\)\)\)/
        h.merge!(:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>8)
      end
      h[:tag_id] = h.delete(:id) if sql =~ /albums_artists.artist_id IN \(8\)/
      h
    end)
    
    Album.dataset = Album.dataset.with_fetch(proc do |sql|
      h = {:id => 3}
      h[:x_foreign_key_x] = 1 if sql =~ /albums_artists.artist_id IN \(1\)/
      h
    end)
    
    Track.dataset = Track.dataset.with_fetch(proc do |sql|
      h = {:id => 4}
      h[:x_foreign_key_x] = 2 if sql =~ /albums_tags.tag_id IN \(2\)/
      h
    end)

    @c1 = Artist
    DB.reset
  end
  after do
    [:Artist, :Tag, :Album, :Track].each{|x| Object.send(:remove_const, x)}
  end
  
  it "should eagerly load a single many_through_many association" do
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists', 'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly load multiple associations in a single call" do
    a = @c1.eager(:tags, :albums).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.albums.must_equal [Album.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly load multiple associations in separate" do
    a = @c1.eager(:tags).eager(:albums).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.albums.must_equal [Album.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end
  
  it "should allow cascading of eager loading for associations of associated models" do
    a = @c1.eager(:tags=>:tracks).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "should cascade eagerly loading when the :eager association option is used" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:tracks
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :eager when lazily loading an association" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:tracks
    a = @c1.load(:id=>1)
    a.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1)',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "should raise error if attempting to eagerly load an association using :eager_graph option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_graph=>:tracks
    proc{@c1.eager(:tags).all}.must_raise(Sequel::Error)
  end
  
  it "should respect :eager_graph when lazily loading an association" do
    Tag.dataset = Tag.dataset.with_fetch(:id=>2, :tracks_id=>4).with_extend{def columns; [:id] end}
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_graph=>:tracks
    a = @c1.load(:id=>1)
    a.tags
    DB.sqls.must_equal [ 'SELECT tags.id, tracks.id AS tracks_id FROM (SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1)) AS tags LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tags.id) LEFT OUTER JOIN albums ON (albums.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)']
    a.tags.must_equal [Tag.load(:id=>2)]
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :conditions when eagerly loading" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 32) AND (albums_artists.artist_id IN (1)))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :order when eagerly loading" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1)) ORDER BY blah']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end
  
  it "should use the association's block when eager loading by default" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]] do |ds| ds.filter(:a) end
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (a AND (albums_artists.artist_id IN (1)))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should use the :eager_block option when eager loading if given" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_block=>proc{|ds| ds.filter(:b)} do |ds| ds.filter(:a) end
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (b AND (albums_artists.artist_id IN (1)))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a many_through_many association" do
    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>2
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5},{:x_foreign_key_x=>1, :id=>6}])
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (1 = albums_artists.artist_id) LIMIT 2) AS t1']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[1,1]
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>6}])
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (1 = albums_artists.artist_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.first_two_tags.must_equal [Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1]
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>6}, {:x_foreign_key_x=>1, :id=>7}])
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (1 = albums_artists.artist_id) OFFSET 1) AS t1']
    a.first.first_two_tags.must_equal [Tag.load(:id=>6), Tag.load(:id=>7)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a many_through_many association using a :ruby strategy" do
    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>2, :eager_limit_strategy=>:ruby
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5},{:x_foreign_key_x=>1, :id=>6}, {:x_foreign_key_x=>1, :id=>7}])
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[1,1], :eager_limit_strategy=>:ruby
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.first_two_tags.must_equal [Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :eager_limit_strategy=>:ruby
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.first_two_tags.must_equal [Tag.load(:id=>6), Tag.load(:id=>7)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a many_through_many association using a :window_function strategy" do
    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>2, :order=>:name, :eager_limit_strategy=>:window_function
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5},{:x_foreign_key_x=>1, :id=>6}]).with_extend{def supports_window_functions?; true end}
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))) AS t1 WHERE (x_sequel_row_number_x <= 2)']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[2,1], :order=>:name, :eager_limit_strategy=>:window_function
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))) AS t1 WHERE ((x_sequel_row_number_x >= 2) AND (x_sequel_row_number_x < 4))']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :order=>:name, :eager_limit_strategy=>:window_function
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))) AS t1 WHERE (x_sequel_row_number_x >= 2)']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a many_through_many association with composite primary keys on the main table" do
    @c1.dataset = @c1.dataset.with_fetch([{:id1=>1, :id2=>2}])
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>5}, {:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>6}]).with_extend{def supports_window_functions?; true end}
    @c1.set_primary_key([:id1, :id2])
    @c1.columns :id1, :id2
    @c1.many_through_many :first_two_tags, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>2, :order=>:name
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((1 = albums_artists.artist_id1) AND (2 = albums_artists.artist_id2)) ORDER BY name LIMIT 2) AS t1']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[2,1]
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((1 = albums_artists.artist_id1) AND (2 = albums_artists.artist_id2)) LIMIT 2 OFFSET 1) AS t1']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a many_through_many association with composite primary keys on the main table using a :window_function strategy" do
    @c1.dataset = @c1.dataset.with_fetch([{:id1=>1, :id2=>2}])
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>5}, {:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>6}]).with_extend{def supports_window_functions?; true end}
    @c1.set_primary_key([:id1, :id2])
    @c1.columns :id1, :id2
    @c1.many_through_many :first_two_tags, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>2, :order=>:name, :eager_limit_strategy=>:window_function
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x, row_number() OVER (PARTITION BY albums_artists.artist_id1, albums_artists.artist_id2 ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id1, albums_artists.artist_id2) IN ((1, 2)))) AS t1 WHERE (x_sequel_row_number_x <= 2)']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0

    @c1.many_through_many :first_two_tags, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[2,1], :order=>:name, :eager_limit_strategy=>:window_function
    a = @c1.eager(:first_two_tags).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x, row_number() OVER (PARTITION BY albums_artists.artist_id1, albums_artists.artist_id2 ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id1, albums_artists.artist_id2) IN ((1, 2)))) AS t1 WHERE ((x_sequel_row_number_x >= 2) AND (x_sequel_row_number_x < 4))']
    a.first.first_two_tags.must_equal [Tag.load(:id=>5), Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0
  end

  it "should raise an error when attempting to eagerly load an association with the :allow_eager option set to false" do
    @c1.eager(:tags).all
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :allow_eager=>false
    proc{@c1.eager(:tags).all}.must_raise(Sequel::Error)
  end

  it "should respect the association's :select option" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>Sequel[:tags][:name]
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.name, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should respect many_through_many association's :left_primary_key and :right_primary_key options" do
    @c1.send(:define_method, :yyy){values[:yyy]}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :yyy=>8).with_extend{def columns; [:id, :yyy] end}
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:yyy, :right_primary_key=>:tag_id
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.tag_id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (8))']
    a.first.tags.must_equal [Tag.load(:tag_id=>2)]
    DB.sqls.length.must_equal 0
  end
  
  it "should handle composite keys" do
    @c1.send(:define_method, :yyy){values[:yyy]}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :yyy=>8).with_extend{def columns; [:id, :yyy] end}
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.b1 AS x_foreign_key_0_x, albums_artists.b2 AS x_foreign_key_1_x FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1, albums_artists.b2) IN ((1, 8)))']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should respect :after_load callbacks on associations when eager loading" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :after_load=>lambda{|o, as| o[:id] *= 2; as.each{|a| a[:id] *= 3}}
    a = @c1.eager(:tags).all
    a.must_equal [@c1.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tags.must_equal [Tag.load(:id=>6)]
    DB.sqls.length.must_equal 0
  end
    
  it "should raise an error if called without a symbol or hash" do
    proc{@c1.eager_graph(Object.new)}.must_raise(Sequel::Error)
  end

  it "should support association_join" do
    @c1.association_join(:tags).sql.must_equal "SELECT * FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id)"
  end

  it "should support custom selects when using association_join" do
    @c1.select{a(b)}.association_join(:tags).sql.must_equal "SELECT a(b) FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id)"
  end

  it "should eagerly graph a single many_through_many association" do
    a = @c1.eager_graph(:tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph a single many_through_many association using the :window_function strategy" do
    Tag.dataset = Tag.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; literal(opts[:select]) =~ /x_foreign_key_x/ ? [:id, :x_foreign_key_x] : [:id] end
    end
    @c1.many_through_many :tags, :clone=>:tags, :limit=>2
    a = @c1.eager_graph_with_options(:tags, :limit_strategy=>true).with_fetch(:id=>1, :tags_id=>2).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN (SELECT id, x_foreign_key_x FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id)) AS t1 WHERE (x_sequel_row_number_x <= 2)) AS tags ON (tags.x_foreign_key_x = artists.id)']
    a.first.tags.must_equal [Tag.load(:id=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph multiple associations in a single call" do 
    a = @c1.eager_graph(:tags, :albums).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, albums_0.id AS albums_0_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id)']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.albums.must_equal [Album.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph multiple associations in separate calls" do 
    a = @c1.eager_graph(:tags).eager_graph(:albums).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, albums_0.id AS albums_0_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id)']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.albums.must_equal [Album.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end

  it "should allow cascading of eager graphing for associations of associated models" do
    a = @c1.eager_graph(:tags=>:tracks).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, tracks.id AS tracks_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tags.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums_0.id)']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "eager graphing should eliminate duplicates caused by cartesian products" do
    a = @c1.eager_graph(:tags).with_fetch([{:id=>1, :tags_id=>2}, {:id=>1, :tags_id=>3}, {:id=>1, :tags_id=>2}, {:id=>1, :tags_id=>3}]).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)']
    a.first.tags.must_equal [Tag.load(:id=>2), Tag.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end
  
  it "should eager graph multiple associations from the same table" do
    a = @c1.eager_graph(:tags, :other_tags).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, other_tags.id AS other_tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.album_id = albums_0.id) LEFT OUTER JOIN tags AS other_tags ON (other_tags.id = albums_tags_0.tag_id)']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.other_tags.must_equal [Tag.load(:id=>9)]
    DB.sqls.length.must_equal 0
  end

  it "should eager graph a self_referential association" do
    a = @c1.eager_graph(:tags, :artists).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, artists_0.id AS artists_0_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_0.id) LEFT OUTER JOIN artists AS artists_0 ON (artists_0.id = albums_artists_1.artist_id)']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.artists.must_equal [@c1.load(:id=>10)]
    DB.sqls.length.must_equal 0
  end

  it "eager graphing should give you a plain hash when called without .all" do 
    @c1.eager_graph(:tags, :artists).first.must_equal(:albums_0_id=>3, :artists_0_id=>10, :id=>1, :tags_id=>2)
  end

  it "should be able to use eager and eager_graph together" do
    a = @c1.eager_graph(:tags).eager(:albums).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2)]
    a.albums.must_equal [Album.load(:id=>3)]
    DB.sqls.length.must_equal 0
  end

  it "should handle no associated records when eagerly graphing a single many_through_many association" do
    a = @c1.eager_graph(:tags).with_fetch(:id=>1, :tags_id=>nil).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)']
    a.first.tags.must_equal []
    DB.sqls.length.must_equal 0
  end

  it "should handle no associated records when eagerly graphing multiple many_through_many associations" do
    a = @c1.eager_graph(:tags, :albums).with_fetch([{:id=>1, :tags_id=>nil, :albums_0_id=>3}, {:id=>1, :tags_id=>2, :albums_0_id=>nil}, {:id=>1, :tags_id=>5, :albums_0_id=>6}, {:id=>7, :tags_id=>nil, :albums_0_id=>nil}]).all
    a.must_equal [@c1.load(:id=>1), @c1.load(:id=>7)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, albums_0.id AS albums_0_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id)']
    a.first.tags.must_equal [Tag.load(:id=>2), Tag.load(:id=>5)]
    a.first.albums.must_equal [Album.load(:id=>3), Album.load(:id=>6)]
    a.last.tags.must_equal []
    a.last.albums.must_equal []
    DB.sqls.length.must_equal 0
  end

  it "should handle missing associated records when cascading eager graphing for associations of associated models" do
    a = @c1.eager_graph(:tags=>:tracks).with_fetch([{:id=>1, :tags_id=>2, :tracks_id=>4}, {:id=>1, :tags_id=>3, :tracks_id=>nil}, {:id=>2, :tags_id=>nil, :tracks_id=>nil}]).all
    a.must_equal [@c1.load(:id=>1), @c1.load(:id=>2)]
    DB.sqls.must_equal ['SELECT artists.id, tags.id AS tags_id, tracks.id AS tracks_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tags.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums_0.id)']
    a.last.tags.must_equal []
    a = a.first
    a.tags.must_equal [Tag.load(:id=>2), Tag.load(:id=>3)]
    a.tags.first.tracks.must_equal [Track.load(:id=>4)]
    a.tags.last.tracks.must_equal []
    DB.sqls.length.must_equal 0
  end

  it "eager graphing should respect :left_primary_key and :right_primary_key options" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:yyy, :right_primary_key=>:tag_id
    @c1.dataset = @c1.dataset.with_extend{def columns; [:id, :yyy] end}
    Tag.dataset = Tag.dataset.with_extend{def columns; [:id, :tag_id] end}
    a = @c1.eager_graph(:tags).with_fetch(:id=>1, :yyy=>8, :tags_id=>2, :tag_id=>4).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT artists.id, artists.yyy, tags.id AS tags_id, tags.tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.yyy) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.tag_id = albums_tags.tag_id)']
    a.first.tags.must_equal [Tag.load(:id=>2, :tag_id=>4)]
    DB.sqls.length.must_equal 0
  end
  
  it "eager graphing should respect composite keys" do 
    @c1.many_through_many :tags, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:id, :tag_id], :left_primary_key=>[:id, :yyy]
    @c1.dataset = @c1.dataset.with_extend{def columns; [:id, :yyy] end}
    Tag.dataset = Tag.dataset.with_extend{def columns; [:id, :tag_id] end}
    a = @c1.eager_graph(:tags).with_fetch(:id=>1, :yyy=>8, :tags_id=>2, :tag_id=>4).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT artists.id, artists.yyy, tags.id AS tags_id, tags.tag_id FROM artists LEFT OUTER JOIN albums_artists ON ((albums_artists.b1 = artists.id) AND (albums_artists.b2 = artists.yyy)) LEFT OUTER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) LEFT OUTER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) LEFT OUTER JOIN tags ON ((tags.id = albums_tags.g1) AND (tags.tag_id = albums_tags.g2))']
    a.first.tags.must_equal [Tag.load(:id=>2, :tag_id=>4)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the association's :graph_select option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :graph_select=>:b
    a = @c1.eager_graph(:tags).with_fetch(:id=>1, :b=>2).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tags.b FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)']
    a.first.tags.must_equal [Tag.load(:b=>2)]
    DB.sqls.length.must_equal 0
  end

  it "should respect the association's :graph_join_type option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :graph_join_type=>:inner
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end

  it "should respect the association's :join_type option on through" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :join_type=>:natural}, [:albums_tags, :album_id, :tag_id]], :graph_join_type=>:inner
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) NATURAL JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end

  it "should respect the association's :conditions option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON ((tags.id = albums_tags.tag_id) AND (tags.a = 32))'
  end

  it "should respect the association's :graph_conditions option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_conditions=>{:a=>42}
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON ((tags.id = albums_tags.tag_id) AND (tags.a = 42))'
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_conditions=>{:a=>42}, :conditions=>{:a=>32}
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON ((tags.id = albums_tags.tag_id) AND (tags.a = 42))'
  end

  it "should respect the association's :conditions option on through" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :conditions=>{:a=>42}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON ((albums.id = albums_artists.album_id) AND (albums.a = 42)) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end

  it "should respect the association's :graph_block option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON ((tags.id = albums_tags.tag_id) AND (tags.active IS TRUE))'
  end

  it "should respect the association's :block option on through" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON ((albums.id = albums_artists.album_id) AND (albums.active IS TRUE)) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end

  it "should respect the association's :graph_only_conditions option" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_only_conditions=>{:a=>32}
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.a = 32)'
  end

  it "should respect the association's :only_conditions option on through" do 
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :only_conditions=>{:a=>42}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.a = 42) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id)'
  end

  it "should create unique table aliases for all associations" do
    @c1.eager_graph(:artists=>{:artists=>:artists}).sql.must_equal "SELECT artists.id, artists_0.id AS artists_0_id, artists_1.id AS artists_1_id, artists_2.id AS artists_2_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.album_id = albums.id) LEFT OUTER JOIN artists AS artists_0 ON (artists_0.id = albums_artists_0.artist_id) LEFT OUTER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.artist_id = artists_0.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_1.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_2 ON (albums_artists_2.album_id = albums_0.id) LEFT OUTER JOIN artists AS artists_1 ON (artists_1.id = albums_artists_2.artist_id) LEFT OUTER JOIN albums_artists AS albums_artists_3 ON (albums_artists_3.artist_id = artists_1.id) LEFT OUTER JOIN albums AS albums_1 ON (albums_1.id = albums_artists_3.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_4 ON (albums_artists_4.album_id = albums_1.id) LEFT OUTER JOIN artists AS artists_2 ON (artists_2.id = albums_artists_4.artist_id)"
  end

  it "should respect the association's :order" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    @c1.order(Sequel[:artists][:blah2], Sequel[:artists][:blah3]).eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tags.blah1, tags.blah2'
  end

  with_symbol_splitting "should not qualify qualified symbols" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[Sequel.identifier(:blah__id), Sequel.identifier(:blah__id).desc, Sequel.desc(:blah__id), :blah__id, :album_id, Sequel.desc(:album_id), 1, Sequel.lit('RANDOM()'), Sequel.qualify(:b, :a)]
    @c1.order(:artists__blah2, :artists__blah3).eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tags.blah__id, tags.blah__id DESC, blah.id DESC, blah.id, tags.album_id, tags.album_id DESC, 1, RANDOM(), b.a'
  end

  it "should only qualify symbols, identifiers, or ordered versions in association's :order" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[Sequel.identifier(:blah__id), Sequel.identifier(:blah__id).desc, Sequel.desc(Sequel[:blah][:id]), Sequel[:blah][:id], :album_id, Sequel.desc(:album_id), 1, Sequel.lit('RANDOM()'), Sequel.qualify(:b, :a)]
    @c1.order(Sequel[:artists][:blah2], Sequel[:artists][:blah3]).eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tags.blah__id, tags.blah__id DESC, blah.id DESC, blah.id, tags.album_id, tags.album_id DESC, 1, RANDOM(), b.a'
  end

  it "should not respect the association's :order if :order_eager_graph is false" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2], :order_eager_graph=>false
    @c1.order(Sequel[:artists][:blah2], Sequel[:artists][:blah3]).eager_graph(:tags).sql.must_equal 'SELECT artists.id, tags.id AS tags_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3'
  end

  it "should add the associations :order for multiple associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    @c1.many_through_many :albums, [[:albums_artists, :artist_id, :album_id]], :order=>[:blah3, :blah4]
    @c1.eager_graph(:tags, :albums).sql.must_equal 'SELECT artists.id, tags.id AS tags_id, albums_0.id AS albums_0_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) ORDER BY tags.blah1, tags.blah2, albums_0.blah3, albums_0.blah4'
  end

  it "should add the association's :order for cascading associations" do
    @c1.many_through_many :tags, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    Tag.many_through_many :tracks, [[:albums_tags, :tag_id, :album_id], [:albums, :id, :id]], :right_primary_key=>:album_id, :order=>[:blah3, :blah4]
    @c1.eager_graph(:tags=>:tracks).sql.must_equal 'SELECT artists.id, tags.id AS tags_id, tracks.id AS tracks_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tags.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums_0.id) ORDER BY tags.blah1, tags.blah2, tracks.blah3, tracks.blah4'
  end

  it "should use the correct qualifier when graphing multiple tables with extra conditions" do
    @c1.many_through_many :tags, [{:table=>:albums_artists, :left=>:artist_id, :right=>:album_id, :conditions=>{:a=>:b}}, {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]]
    @c1.many_through_many :albums, [{:table=>:albums_artists, :left=>:artist_id, :right=>:album_id, :conditions=>{:c=>:d}}]
    @c1.eager_graph(:tags, :albums).sql.must_equal 'SELECT artists.id, tags.id AS tags_id, albums_0.id AS albums_0_id FROM artists LEFT OUTER JOIN albums_artists ON ((albums_artists.artist_id = artists.id) AND (albums_artists.a = artists.b)) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags ON (tags.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON ((albums_artists_0.artist_id = artists.id) AND (albums_artists_0.c = artists.d)) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id)'
  end
end

describe "many_through_many associations with non-column expression keys" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :object_ids=>[2]})
    @Foo = Class.new(Sequel::Model(@db[:foos]))
    @Foo.columns :id, :object_ids
    @Foo.plugin :many_through_many
    m = Module.new{def obj_id; object_ids[0]; end}
    @Foo.include m

    @Foo.many_through_many :foos, [
      [:f, Sequel.subscript(:l, 0), Sequel.subscript(:r, 0)],
      [:f, Sequel.subscript(:l, 1), Sequel.subscript(:r, 1)]
    ], :class=>@Foo, :left_primary_key=>:obj_id, :left_primary_key_column=>Sequel.subscript(:object_ids, 0), :right_primary_key=>Sequel.subscript(:object_ids, 0), :right_primary_key_method=>:obj_id
    @foo = @Foo.load(:id=>1, :object_ids=>[2])
    @db.sqls
  end

  it "should have working regular association methods" do
    @Foo.first.foos.must_equal [@foo]
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT foos.* FROM foos INNER JOIN f ON (f.r[1] = foos.object_ids[0]) INNER JOIN f AS f_0 ON (f_0.r[0] = f.l[1]) WHERE (f_0.l[0] = 2)"]
  end

  it "should have working eager loading methods" do
    @db.fetch = [[{:id=>1, :object_ids=>[2]}], [{:id=>1, :object_ids=>[2], :x_foreign_key_x=>2}]]
    @Foo.eager(:foos).all.map{|o| [o, o.foos]}.must_equal [[@foo, [@foo]]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT foos.*, f_0.l[0] AS x_foreign_key_x FROM foos INNER JOIN f ON (f.r[1] = foos.object_ids[0]) INNER JOIN f AS f_0 ON (f_0.r[0] = f.l[1]) WHERE (f_0.l[0] IN (2))"]
  end

  it "should have working eager graphing methods" do
    @db.fetch = {:id=>1, :object_ids=>[2], :foos_0_id=>1, :foos_0_object_ids=>[2]}
    @Foo.eager_graph(:foos).all.map{|o| [o, o.foos]}.must_equal [[@foo, [@foo]]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_ids, foos_0.id AS foos_0_id, foos_0.object_ids AS foos_0_object_ids FROM foos LEFT OUTER JOIN f ON (f.l[0] = foos.object_ids[0]) LEFT OUTER JOIN f AS f_0 ON (f_0.l[1] = f.r[0]) LEFT OUTER JOIN foos AS foos_0 ON (foos_0.object_ids[0] = f_0.r[1])"]
  end

  it "should have working filter by associations with model instances" do
    @Foo.first(:foos=>@foo).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT f.l[0] FROM f INNER JOIN f AS f_0 ON (f_0.l[1] = f.r[0]) WHERE ((f_0.r[1] = 2) AND (f.l[0] IS NOT NULL)))) LIMIT 1"]
  end

  it "should have working filter by associations with model datasets" do
    @Foo.first(:foos=>@Foo.where(:id=>@foo.id)).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT f.l[0] FROM f INNER JOIN f AS f_0 ON (f_0.l[1] = f.r[0]) WHERE ((f_0.r[1] IN (SELECT foos.object_ids[0] FROM foos WHERE ((id = 1) AND (foos.object_ids[0] IS NOT NULL)))) AND (f.l[0] IS NOT NULL)))) LIMIT 1"]
  end
end

describe Sequel::Model, "one_through_many" do
  before do
    class ::Artist < Sequel::Model
      attr_accessor :yyy
      columns :id
      plugin :many_through_many
    end
    class ::Tag < Sequel::Model
      columns :id, :h1, :h2
    end
    @c1 = Artist
    @c2 = Tag
    @dataset = @c2.dataset = @c2.dataset.with_fetch(:id=>1)
    DB.reset
  end
  after do
    Object.send(:remove_const, :Artist)
    Object.send(:remove_const, :Tag)
  end

  it "should support using a custom :left_primary_key option when eager loading many_to_many associations" do
    @c1.send(:define_method, :id3){id*3}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>3)
    @c1.one_through_many :tag, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:id3
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (3))"]
    a.first.tag.must_equal @c2.load(:id=>4)
    DB.sqls.must_equal []
  end

  it "should handle a :predicate_key option to change the SQL used in the lookup" do
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    @c2.dataset = @c2.dataset.with_fetch(:id=>4, :x_foreign_key_x=>1)
    @c1.one_through_many :tag, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :predicate_key=>(Sequel[:albums_artists][:artist_id] / 3)
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id => 1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT tags.*, (albums_artists.artist_id / 3) AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id / 3) IN (1))"]
    a.first.tag.must_equal @c2.load(:id=>4)
  end
  
  it "should raise an error if in invalid form of through is used" do
    proc{@c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id]]}.must_raise(Sequel::Error)
    proc{@c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], {:table=>:album_tags, :left=>:album_id}]}.must_raise(Sequel::Error)
    proc{@c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], :album_tags]}.must_raise(Sequel::Error)
  end

  it "should allow only two arguments with the :through option" do
    @c1.one_through_many :tag, :through=>[[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should be clonable" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.many_through_many :tags, :clone=>:tag
    @c1.one_through_many :tag, :clone=>:tags
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should use join tables given" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should handle multiple aliasing of tables" do
    begin
      class ::Album < Sequel::Model
      end
      @c1.one_through_many :album, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id], [:artists, :id, :id], [:albums_artists, :artist_id, :album_id]]
      n = @c1.load(:id => 1234)
      n.album_dataset.sql.must_equal 'SELECT albums.* FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) INNER JOIN artists ON (artists.id = albums_artists.artist_id) INNER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) INNER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) INNER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_0.id) WHERE (albums_artists_1.artist_id = 1234) LIMIT 1'
      n.album.must_equal Album.load(:id=>1, :x=>1)
    ensure
      Object.send(:remove_const, :Album)
    end
  end

  it "should use explicit class if given" do
    @c1.one_through_many :album_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag
    n = @c1.load(:id => 1234)
    n.album_tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.album_tag.must_equal @c2.load(:id=>1)
  end

  it "should accept :left_primary_key and :right_primary_key option for primary keys to use in current and associated table" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :right_primary_key=>:tag_id, :left_primary_key=>:yyy
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.tag_id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 85) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should handle composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1 = 1234) AND (albums_artists.b2 = 85)) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should allowing filtering by one_through_many associations" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many associations with a single through table" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id]]
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists WHERE ((albums_artists.album_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many associations with aliased tables" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums_artists, :id, :id], [:albums_artists, :album_id, :tag_id]]
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.id = albums_artists.album_id) INNER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_artists_0.id) WHERE ((albums_artists_1.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many associations with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tag=>@c2.load(:h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE ((albums_tags.g1 = 1234) AND (albums_tags.g2 = 85) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many associations with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by one_through_many associations with :conditions with a single through table" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_artists ON (albums_artists.album_id = tags.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by one_through_many associations with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id = 1))))"
  end

  it "should allowing filtering by one_through_many associations with :order" do
    @c2.dataset = @c2.dataset.with_extend{def supports_distinct_on?; true end}
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:name
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id IS NOT NULL) AND ((albums_artists.artist_id, tags.id) IN (SELECT DISTINCT ON (albums_artists.artist_id) albums_artists.artist_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) ORDER BY albums_artists.artist_id, name)) AND (tags.id = 1234))))'
  end

  it "should allowing filtering by one_through_many associations with :order and composite keys" do
    @c2.dataset = @c2.dataset.with_extend{def supports_distinct_on?; true end}
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :order=>:name
    @c1.filter(:tag=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND ((albums_artists.b1, albums_artists.b2, tags.id) IN (SELECT DISTINCT ON (albums_artists.b1, albums_artists.b2) albums_artists.b1, albums_artists.b2, tags.id FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) ORDER BY albums_artists.b1, albums_artists.b2, name)) AND (tags.id = 1))))'
  end

  it "should allowing filtering by one_through_many associations with :order and :conditions" do
    @c2.dataset = @c2.dataset.with_extend{def supports_distinct_on?; true end}
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}, :order=>:name
    @c1.filter(:tag=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND ((albums_artists.artist_id, tags.id) IN (SELECT DISTINCT ON (albums_artists.artist_id) albums_artists.artist_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (name = 'A') ORDER BY albums_artists.artist_id, name)) AND (tags.id = 1234))))"
  end

  it "should allowing filtering by one_through_many associations with :order and :conditions and composite keys" do
    @c2.dataset = @c2.dataset.with_extend{def supports_distinct_on?; true end}
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}, :order=>:name
    @c1.filter(:tag=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND ((albums_artists.b1, albums_artists.b2, tags.id) IN (SELECT DISTINCT ON (albums_artists.b1, albums_artists.b2) albums_artists.b1, albums_artists.b2, tags.id FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE (name = 'A') ORDER BY albums_artists.b1, albums_artists.b2, name)) AND (tags.id = 1))))"
  end

  it "should allowing excluding by one_through_many associations" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tag=>@c2.load(:id=>1234)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id = 1234) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by one_through_many associations with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tag=>@c2.load(:h1=>1234, :h2=>85)).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE ((albums_tags.g1 = 1234) AND (albums_tags.g2 = 85) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by one_through_many associations with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>@c2.load(:id=>1234)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id = 1234)))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by one_through_many associations with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>@c2.load(:id=>1, :h1=>1234, :h2=>85)).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id = 1)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should allowing filtering by multiple one_through_many associations" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tag=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (1234, 2345)) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by multiple one_through_many associations with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tag=>[@c2.load(:h1=>1234, :h2=>85), @c2.load(:h1=>2345, :h2=>95)]).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN ((1234, 85), (2345, 95))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by multiple one_through_many associations with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (1234, 2345)))))"
  end

  it "should allowing filtering by multiple one_through_many associations with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>[@c2.load(:id=>1, :h1=>1234, :h2=>85), @c2.load(:id=>2, :h1=>2345, :h2=>95)]).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (1, 2)))))"
  end

  it "should allowing excluding by multiple one_through_many associations" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tag=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (1234, 2345)) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by multiple one_through_many associations with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tag=>[@c2.load(:h1=>1234, :h2=>85), @c2.load(:h1=>2345, :h2=>95)]).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN ((1234, 85), (2345, 95))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by multiple one_through_many associations with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>[@c2.load(:id=>1234), @c2.load(:id=>2345)]).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (1234, 2345))))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by multiple one_through_many associations with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>[@c2.load(:id=>1, :h1=>1234, :h2=>85), @c2.load(:id=>2, :h1=>2345, :h2=>95)]).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (1, 2))))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should allowing filtering/excluding one_through_many associations with NULL values" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tag=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE \'f\''
    @c1.exclude(:tag=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE \'t\''
  end

  it "should allowing filtering by one_through_many association datasets" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.filter(:tag=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_artists.artist_id IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many association datasets with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.filter(:tag=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN (SELECT tags.h1, tags.h2 FROM tags WHERE ((x = 1) AND (tags.h1 IS NOT NULL) AND (tags.h2 IS NOT NULL)))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL))))'
  end

  it "should allowing filtering by one_through_many association datasets with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should allowing filtering by one_through_many association datasets with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.filter(:tag=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id, artists.yyy) IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should allowing excluding by one_through_many association datasets" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.exclude(:tag=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM albums_artists INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_artists.artist_id IS NOT NULL)))) OR (artists.id IS NULL))'
  end

  it "should allowing excluding by one_through_many association datasets with composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    @c1.exclude(:tag=>@c2.filter(:x=>1)).sql.must_equal 'SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM albums_artists INNER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) INNER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) WHERE (((albums_tags.g1, albums_tags.g2) IN (SELECT tags.h1, tags.h2 FROM tags WHERE ((x = 1) AND (tags.h1 IS NOT NULL) AND (tags.h2 IS NOT NULL)))) AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL)))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))'
  end

  it "should allowing excluding by one_through_many association datasets with :conditions" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE ((artists.id NOT IN (SELECT albums_artists.artist_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((name = 'A') AND (albums_artists.artist_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (artists.id IS NULL))"
  end

  it "should allowing excluding by one_through_many association datasets with :conditions and composite keys" do
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy], :conditions=>{:name=>'A'}
    @c1.exclude(:tag=>@c2.filter(:x=>1)).sql.must_equal "SELECT * FROM artists WHERE (((artists.id, artists.yyy) NOT IN (SELECT albums_artists.b1, albums_artists.b2 FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((name = 'A') AND (albums_artists.b1 IS NOT NULL) AND (albums_artists.b2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (artists.id IS NULL) OR (artists.yyy IS NULL))"
  end

  it "should support a :conditions option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 32) AND (albums_artists.artist_id = 1234)) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)

    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>Sequel.lit('a = ?', 42)
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 42) AND (albums_artists.artist_id = 1234)) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should support an :order option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) ORDER BY blah LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should support an array for the :order option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) ORDER BY blah1, blah2 LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should support a select option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>:blah
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT blah FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should support an array for the select option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>[Sequel::SQL::ColumnAll.new(:tags), Sequel[:albums][:name]]
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.*, albums.name FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end
  
  it "should accept a block" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]] do |ds| ds.filter(:yyy=>@yyy) end
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id = 1234) AND (yyy = 85)) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should allow the :order option while accepting a block" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah do |ds| ds.filter(:yyy=>@yyy) end
    n = @c1.load(:id => 1234)
    n.yyy = 85
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id = 1234) AND (yyy = 85)) ORDER BY blah LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should support a :dataset option that is used instead of the default" do
    @c1.one_through_many :tag, [[:a, :b, :c]], :dataset=>proc{Tag.join(:albums_tags, [:tag_id]).join(:albums, [:album_id]).join(:albums_artists, [:album_id]).filter(Sequel[:albums_artists][:artist_id]=>id)}
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags USING (tag_id) INNER JOIN albums USING (album_id) INNER JOIN albums_artists USING (album_id) WHERE (albums_artists.artist_id = 1234) LIMIT 1'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should support a :limit option to specify an offset" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :limit=>[nil, 10]
    n = @c1.load(:id => 1234)
    n.tag_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1 OFFSET 10'
    n.tag.must_equal @c2.load(:id=>1)
  end

  it "should have the :eager option affect the _dataset method" do
    @c2.many_to_many :fans
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:fans
    @c1.load(:id => 1234).tag_dataset.opts[:eager].must_equal(:fans=>nil)
  end
  
  it "should return the associated object" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    @c1.load(:id => 1234).tag.must_equal @c2.load(:id=>1)
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1']
  end

  it "should populate cache when accessed" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tag].must_be_nil
    DB.sqls.must_equal []
    n.tag.must_equal @c2.load(:id=>1)
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1']
    n.associations[:tag].must_equal n.tag
    DB.sqls.length.must_equal 0
  end

  it "should use cache if available" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tag] = nil
    n.tag.must_be_nil
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    n = @c1.load(:id => 1234)
    n.associations[:tag] = nil
    DB.sqls.must_equal []
    n.tag(:reload=>true).must_equal @c2.load(:id=>1)
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1234) LIMIT 1']
    n.associations[:tag].must_equal n.tag
    DB.sqls.length.must_equal 0
  end

  it "should not add associations methods directly to class" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
    im = @c1.instance_methods
    im.must_include(:tag)
    im.must_include(:tag_dataset)
    im2 = @c1.instance_methods(false)
    im2.wont_include(:tag)
    im2.wont_include(:tag_dataset)
  end

  it "should support after_load association callback" do
    h = []
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :after_load=>:al
    @c1.class_eval do
      self::Foo = h
      def al(v)
        model::Foo << v.pk * 20
      end
    end
    @c2.dataset = @c2.dataset.with_fetch(:id=>20)
    p = @c1.load(:id=>10, :parent_id=>20)
    p.tag
    h.must_equal [400]
    p.tag.pk.must_equal 20
  end
end

describe "one_through_many eager loading methods" do
  before do
    class ::Artist < Sequel::Model
      plugin :many_through_many
      one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]]
      one_through_many :other_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>:Tag
      one_through_many :album, [[:albums_artists, :artist_id, :album_id]]
      one_through_many :artist, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id]]
    end
    class ::Tag < Sequel::Model
      plugin :many_through_many
      one_through_many :track, [[:albums_tags, :tag_id, :album_id], [:albums, :id, :id]], :right_primary_key=>:album_id
    end
    class ::Album < Sequel::Model
    end
    class ::Track < Sequel::Model
    end
    Artist.dataset = Artist.dataset.with_fetch(proc do |sql|
      h = {:id => 1}
      if sql =~ /FROM artists LEFT OUTER JOIN albums_artists/
        h[:tag_id] = 2
        h[:album_id] = 3 if sql =~ /LEFT OUTER JOIN albums AS album/
        h[:track_id] = 4 if sql =~ /LEFT OUTER JOIN tracks AS track/
        h[:other_tag_id] = 9 if sql =~ /other_tag\.id AS other_tag_id/
        h[:artist_id] = 10 if sql =~ /artists_0\.id AS artist_id/
      end
      h
    end)
    Artist.dataset.columns(:id)
    
    Tag.dataset = Tag.dataset.with_fetch(proc do |sql|
      h = {:id => 2}
      if sql =~ /albums_artists.artist_id IN \(([18])\)/
        h[:x_foreign_key_x] = $1.to_i 
      elsif sql =~ /\(\(albums_artists.b1, albums_artists.b2\) IN \(\(1, 8\)\)\)/
        h.merge!(:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>8)
      end
      h[:tag_id] = h.delete(:id) if sql =~ /albums_artists.artist_id IN \(8\)/
      h
    end)
    
    Album.dataset = Album.dataset.with_fetch(proc do |sql|
      h = {:id => 3}
      h[:x_foreign_key_x] = 1 if sql =~ /albums_artists.artist_id IN \(1\)/
      h
    end)
    
    Track.dataset = Track.dataset.with_fetch(proc do |sql|
      h = {:id => 4}
      h[:x_foreign_key_x] = 2 if sql =~ /albums_tags.tag_id IN \(2\)/
      h
    end)

    @c1 = Artist
    DB.reset
  end
  after do
    [:Artist, :Tag, :Album, :Track].each{|x| Object.send(:remove_const, x)}
  end
  
  it "should eagerly load a single one_through_many association" do
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists', 'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly load multiple associations in a single call" do
    a = @c1.eager(:tag, :album).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.album.must_equal Album.load(:id=>3)
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly load multiple associations in separate" do
    a = @c1.eager(:tag).eager(:album).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.album.must_equal Album.load(:id=>3)
    DB.sqls.length.must_equal 0
  end
  
  it "should allow cascading of eager loading for associations of associated models" do
    a = @c1.eager(:tag=>:track).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.tag.track.must_equal Track.load(:id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "should cascade eagerly loading when the :eager association option is used" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:track
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.tag.track.must_equal Track.load(:id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :eager when lazily loading an association" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager=>:track
    a = @c1.load(:id=>1)
    a.tag.must_equal Tag.load(:id=>2)
    DB.sqls.must_equal ['SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1) LIMIT 1',
      'SELECT tracks.*, albums_tags.tag_id AS x_foreign_key_x FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) WHERE (albums_tags.tag_id IN (2))']
    a.tag.track.must_equal Track.load(:id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "should raise error if attempting to eagerly load an association using :eager_graph option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_graph=>:track
    proc{@c1.eager(:tag).all}.must_raise(Sequel::Error)
  end
  
  it "should respect :eager_graph when lazily loading an association" do
    Tag.dataset = Tag.dataset.with_fetch(:id=>2, :track_id=>4).with_extend{def columns; [:id] end}
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_graph=>:track
    a = @c1.load(:id=>1)
    a.tag
    DB.sqls.must_equal [ 'SELECT tags.id, track.id AS track_id FROM (SELECT tags.* FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id = 1) LIMIT 1) AS tags LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tags.id) LEFT OUTER JOIN albums ON (albums.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks AS track ON (track.album_id = albums.id)']
    a.tag.must_equal Tag.load(:id=>2)
    a.tag.track.must_equal Track.load(:id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :conditions when eagerly loading" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((a = 32) AND (albums_artists.artist_id IN (1)))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end
  
  it "should respect :order when eagerly loading" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :order=>:blah, :eager_limit_strategy=>:ruby
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1)) ORDER BY blah']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end
  
  it "should use the association's block when eager loading by default" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]] do |ds| ds.filter(:a) end
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (a AND (albums_artists.artist_id IN (1)))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should use the :eager_block option when eager loading if given" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :eager_block=>proc{|ds| ds.filter(:b)} do |ds| ds.filter(:a) end
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (b AND (albums_artists.artist_id IN (1)))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a one_through_many association" do
    @c1.one_through_many :second_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1]
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>6}])
    a = @c1.eager(:second_tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (1 = albums_artists.artist_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.second_tag.must_equal Tag.load(:id=>6)
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a one_through_many association using the :ruby strategy" do
    @c1.one_through_many :second_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :eager_limit_strategy=>:ruby
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5}, {:x_foreign_key_x=>1, :id=>6}])
    a = @c1.eager(:second_tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.second_tag.must_equal Tag.load(:id=>6)
    DB.sqls.length.must_equal 0
  end

  it "should eagerly load a single one_through_many association using the :distinct_on strategy" do
    @c1.one_through_many :second_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :order=>:name, :eager_limit_strategy=>:distinct_on
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5}]).with_extend{def supports_distinct_on?; true end}
    a = @c1.eager(:second_tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists', "SELECT DISTINCT ON (albums_artists.artist_id) tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1)) ORDER BY albums_artists.artist_id, name"]
    a.first.second_tag.must_equal Tag.load(:id=>5)
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly load a single one_through_many association using the :window_function strategy" do
    @c1.one_through_many :second_tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :order=>:name, :eager_limit_strategy=>:window_function
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>5}]).with_extend{def supports_window_functions?; true end}
    a = @c1.eager(:second_tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))) AS t1 WHERE (x_sequel_row_number_x = 2)']
    a.first.second_tag.must_equal Tag.load(:id=>5)
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a one_through_many association with composite primary keys on the main table" do
    @c1.set_primary_key([:id1, :id2])
    @c1.columns :id1, :id2

    @c1.one_through_many :second_tag, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :order=>:name
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>5}]).with_extend{def supports_window_functions?; true end}
    a = @c1.eager(:second_tag).with_fetch(:id1=>1, :id2=>2).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((1 = albums_artists.artist_id1) AND (2 = albums_artists.artist_id2)) ORDER BY name LIMIT 1 OFFSET 1) AS t1']
    a.first.second_tag.must_equal Tag.load(:id=>5)
    DB.sqls.length.must_equal 0
  end

  it "should respect the :limit option on a one_through_many association with composite primary keys on the main table using a :window_function strategy" do
    @c1.set_primary_key([:id1, :id2])
    @c1.columns :id1, :id2

    @c1.one_through_many :second_tag, [[:albums_artists, [:artist_id1, :artist_id2], :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :class=>Tag, :limit=>[nil,1], :order=>:name, :eager_limit_strategy=>:window_function
    Tag.dataset = Tag.dataset.with_fetch([{:x_foreign_key_0_x=>1, :x_foreign_key_1_x=>2, :id=>5}]).with_extend{def supports_window_functions?; true end}
    a = @c1.eager(:second_tag).with_fetch(:id1=>1, :id2=>2).all
    a.must_equal [@c1.load(:id1=>1, :id2=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT * FROM (SELECT tags.*, albums_artists.artist_id1 AS x_foreign_key_0_x, albums_artists.artist_id2 AS x_foreign_key_1_x, row_number() OVER (PARTITION BY albums_artists.artist_id1, albums_artists.artist_id2 ORDER BY name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE ((albums_artists.artist_id1, albums_artists.artist_id2) IN ((1, 2)))) AS t1 WHERE (x_sequel_row_number_x = 2)']
    a.first.second_tag.must_equal Tag.load(:id=>5)
    DB.sqls.length.must_equal 0
  end

  it "should raise an error when attempting to eagerly load an association with the :allow_eager option set to false" do
    @c1.eager(:tag).all
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :allow_eager=>false
    proc{@c1.eager(:tag).all}.must_raise(Sequel::Error)
  end

  it "should respect the association's :select option" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :select=>Sequel[:tags][:name]
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.name, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should respect one_through_many association's :left_primary_key and :right_primary_key options" do
    @c1.send(:define_method, :yyy){values[:yyy]}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :yyy=>8).with_extend{def columns; [:id, :yyy] end}
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:yyy, :right_primary_key=>:tag_id
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.tag_id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (8))']
    a.first.tag.must_equal Tag.load(:tag_id=>2)
    DB.sqls.length.must_equal 0
  end
  
  it "should handle composite keys" do
    @c1.send(:define_method, :yyy){values[:yyy]}
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :yyy=>8).with_extend{def columns; [:id, :yyy] end}
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:h1, :h2], :left_primary_key=>[:id, :yyy]
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.b1 AS x_foreign_key_0_x, albums_artists.b2 AS x_foreign_key_1_x FROM tags INNER JOIN albums_tags ON ((albums_tags.g1 = tags.h1) AND (albums_tags.g2 = tags.h2)) INNER JOIN albums ON ((albums.e1 = albums_tags.f1) AND (albums.e2 = albums_tags.f2)) INNER JOIN albums_artists ON ((albums_artists.c1 = albums.d1) AND (albums_artists.c2 = albums.d2)) WHERE ((albums_artists.b1, albums_artists.b2) IN ((1, 8)))']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should respect :after_load callbacks on associations when eager loading" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :after_load=>lambda{|o, a| o[:id] *= 2; a[:id] *= 3}
    a = @c1.eager(:tag).all
    a.must_equal [@c1.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM artists',
      'SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a.first.tag.must_equal Tag.load(:id=>6)
    DB.sqls.length.must_equal 0
  end
    
  it "should support association_join" do
    @c1.association_join(:tag).sql.must_equal "SELECT * FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)"
  end

  it "should eagerly graph a single one_through_many association" do
    a = @c1.eager_graph(:tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph a single one_through_many association using the :distinct_on strategy" do
    Tag.dataset = Tag.dataset.with_extend{def supports_distinct_on?; true end}
    a = @c1.eager_graph_with_options(:tag, :limit_strategy=>true).with_fetch(:id=>1, :tag_id=>2).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN (SELECT DISTINCT ON (albums_artists.artist_id) tags.*, albums_artists.artist_id AS x_foreign_key_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) ORDER BY albums_artists.artist_id) AS tag ON (tag.x_foreign_key_x = artists.id)']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end
  
  it "should eagerly graph a single one_through_many association using the :window_function strategy" do
    Tag.dataset = Tag.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; literal(opts[:select]) =~ /x_foreign_key_x/ ? [:id, :x_foreign_key_x] : [:id] end
    end
    a = @c1.eager_graph_with_options(:tag, :limit_strategy=>true).with_fetch(:id=>1, :tag_id=>2).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN (SELECT id, x_foreign_key_x FROM (SELECT tags.*, albums_artists.artist_id AS x_foreign_key_x, row_number() OVER (PARTITION BY albums_artists.artist_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) INNER JOIN albums_artists ON (albums_artists.album_id = albums.id)) AS t1 WHERE (x_sequel_row_number_x = 1)) AS tag ON (tag.x_foreign_key_x = artists.id)']
    a.first.tag.must_equal Tag.load(:id=>2)
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph multiple associations in a single call" do 
    a = @c1.eager_graph(:tag, :album).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, album.id AS album_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS album ON (album.id = albums_artists_0.album_id)']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.album.must_equal Album.load(:id=>3)
    DB.sqls.length.must_equal 0
  end

  it "should eagerly graph multiple associations in separate calls" do 
    a = @c1.eager_graph(:tag).eager_graph(:album).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, album.id AS album_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS album ON (album.id = albums_artists_0.album_id)']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.album.must_equal Album.load(:id=>3)
    DB.sqls.length.must_equal 0
  end

  it "should allow cascading of eager graphing for associations of associated models" do
    a = @c1.eager_graph(:tag=>:track).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, track.id AS track_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tag.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks AS track ON (track.album_id = albums_0.id)']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.tag.track.must_equal Track.load(:id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "should eager graph multiple associations from the same table" do
    a = @c1.eager_graph(:tag, :other_tag).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, other_tag.id AS other_tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.album_id = albums_0.id) LEFT OUTER JOIN tags AS other_tag ON (other_tag.id = albums_tags_0.tag_id)']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.other_tag.must_equal Tag.load(:id=>9)
    DB.sqls.length.must_equal 0
  end

  it "should eager graph a self_referential association" do
    a = @c1.eager_graph(:tag, :artist).with_fetch(:id=>1, :tag_id=>2, :artist_id=>10).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, artist.id AS artist_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_0.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.album_id = albums_0.id) LEFT OUTER JOIN artists AS artist ON (artist.id = albums_artists_1.artist_id)']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.artist.must_equal @c1.load(:id=>10)
    DB.sqls.length.must_equal 0
  end

  it "should be able to use eager and eager_graph together" do
    a = @c1.eager_graph(:tag).eager(:album).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)',
      'SELECT albums.*, albums_artists.artist_id AS x_foreign_key_x FROM albums INNER JOIN albums_artists ON (albums_artists.album_id = albums.id) WHERE (albums_artists.artist_id IN (1))']
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.album.must_equal Album.load(:id=>3)
    DB.sqls.length.must_equal 0
  end

  it "should handle no associated records when eagerly graphing a single one_through_many association" do
    a = @c1.eager_graph(:tag).with_fetch(:id=>1, :tag_id=>nil).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)']
    a.first.tag.must_be_nil
    DB.sqls.length.must_equal 0
  end

  it "should handle no associated records when eagerly graphing multiple one_through_many associations" do
    a = @c1.eager_graph(:tag, :album).with_fetch([{:id=>1, :tag_id=>5, :album_id=>6}, {:id=>7, :tag_id=>nil, :albums_0_id=>nil}]).all
    a.must_equal [@c1.load(:id=>1), @c1.load(:id=>7)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, album.id AS album_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.artist_id = artists.id) LEFT OUTER JOIN albums AS album ON (album.id = albums_artists_0.album_id)']
    a.first.tag.must_equal Tag.load(:id=>5)
    a.first.album.must_equal Album.load(:id=>6)
    a.last.tag.must_be_nil
    a.last.album.must_be_nil
    DB.sqls.length.must_equal 0
  end

  it "should handle missing associated records when cascading eager graphing for associations of associated models" do
    a = @c1.eager_graph(:tag=>:track).with_fetch([{:id=>1, :tag_id=>2, :track_id=>nil}, {:id=>2, :tag_id=>nil, :tracks_id=>nil}]).all
    a.must_equal [@c1.load(:id=>1), @c1.load(:id=>2)]
    DB.sqls.must_equal ['SELECT artists.id, tag.id AS tag_id, track.id AS track_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) LEFT OUTER JOIN albums_tags AS albums_tags_0 ON (albums_tags_0.tag_id = tag.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_tags_0.album_id) LEFT OUTER JOIN tracks AS track ON (track.album_id = albums_0.id)']
    a.last.tag.must_be_nil
    a = a.first
    a.tag.must_equal Tag.load(:id=>2)
    a.tag.track.must_be_nil
    DB.sqls.length.must_equal 0
  end

  it "eager graphing should respect :left_primary_key and :right_primary_key options" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :left_primary_key=>:yyy, :right_primary_key=>:tag_id
    @c1.dataset = @c1.dataset.with_extend{def columns; [:id, :yyy] end}
    Tag.dataset = Tag.dataset.with_extend{def columns; [:id, :tag_id] end}
    a = @c1.eager_graph(:tag).with_fetch(:id=>1, :yyy=>8, :tag_id=>2, :tag_tag_id=>4).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT artists.id, artists.yyy, tag.id AS tag_id, tag.tag_id AS tag_tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.yyy) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.tag_id = albums_tags.tag_id)']
    a.first.tag.must_equal Tag.load(:id=>2, :tag_id=>4)
    DB.sqls.length.must_equal 0
  end
  
  it "eager graphing should respect composite keys" do 
    @c1.one_through_many :tag, [[:albums_artists, [:b1, :b2], [:c1, :c2]], [:albums, [:d1, :d2], [:e1, :e2]], [:albums_tags, [:f1, :f2], [:g1, :g2]]], :right_primary_key=>[:id, :tag_id], :left_primary_key=>[:id, :yyy]
    @c1.dataset = @c1.dataset.with_extend{def columns; [:id, :yyy] end}
    Tag.dataset = Tag.dataset.with_extend{def columns; [:id, :tag_id] end}
    a = @c1.eager_graph(:tag).with_fetch(:id=>1, :yyy=>8, :tag_id=>2, :tag_tag_id=>4).all
    a.must_equal [@c1.load(:id=>1, :yyy=>8)]
    DB.sqls.must_equal ['SELECT artists.id, artists.yyy, tag.id AS tag_id, tag.tag_id AS tag_tag_id FROM artists LEFT OUTER JOIN albums_artists ON ((albums_artists.b1 = artists.id) AND (albums_artists.b2 = artists.yyy)) LEFT OUTER JOIN albums ON ((albums.d1 = albums_artists.c1) AND (albums.d2 = albums_artists.c2)) LEFT OUTER JOIN albums_tags ON ((albums_tags.f1 = albums.e1) AND (albums_tags.f2 = albums.e2)) LEFT OUTER JOIN tags AS tag ON ((tag.id = albums_tags.g1) AND (tag.tag_id = albums_tags.g2))']
    a.first.tag.must_equal Tag.load(:id=>2, :tag_id=>4)
    DB.sqls.length.must_equal 0
  end

  it "should respect the association's :graph_select option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :graph_select=>:b
    a = @c1.eager_graph(:tag).with_fetch(:id=>1, :b=>2).all
    a.must_equal [@c1.load(:id=>1)]
    DB.sqls.must_equal ['SELECT artists.id, tag.b FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)']
    a.first.tag.must_equal Tag.load(:b=>2)
    DB.sqls.length.must_equal 0
  end

  it "should respect the association's :graph_join_type option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_tags, :album_id, :tag_id]], :graph_join_type=>:inner
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) INNER JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)'
  end

  it "should respect the association's :join_type option on through" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :join_type=>:natural}, [:albums_tags, :album_id, :tag_id]], :graph_join_type=>:inner
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists INNER JOIN albums_artists ON (albums_artists.artist_id = artists.id) NATURAL JOIN albums ON (albums.id = albums_artists.album_id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)'
  end

  it "should respect the association's :conditions option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :conditions=>{:a=>32}
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON ((tag.id = albums_tags.tag_id) AND (tag.a = 32))'
  end

  it "should respect the association's :graph_conditions option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_conditions=>{:a=>42}
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON ((tag.id = albums_tags.tag_id) AND (tag.a = 42))'
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_conditions=>{:a=>42}, :conditions=>{:a=>32}
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON ((tag.id = albums_tags.tag_id) AND (tag.a = 42))'
  end

  it "should respect the association's :conditions option on through" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :conditions=>{:a=>42}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON ((albums.id = albums_artists.album_id) AND (albums.a = 42)) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)'
  end

  it "should respect the association's :graph_block option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON ((tag.id = albums_tags.tag_id) AND (tag.active IS TRUE))'
  end

  it "should respect the association's :block option on through" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON ((albums.id = albums_artists.album_id) AND (albums.active IS TRUE)) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)'
  end

  it "should respect the association's :graph_only_conditions option" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :graph_only_conditions=>{:a=>32}
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.a = 32)'
  end

  it "should respect the association's :only_conditions option on through" do 
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id, :only_conditions=>{:a=>42}}, [:albums_tags, :album_id, :tag_id]]
    @c1.eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.a = 42) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id)'
  end

  it "should create unique table aliases for all associations" do
    @c1.eager_graph(:artist=>{:artist=>:artist}).sql.must_equal "SELECT artists.id, artist.id AS artist_id, artist_0.id AS artist_0_id, artist_1.id AS artist_1_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_0 ON (albums_artists_0.album_id = albums.id) LEFT OUTER JOIN artists AS artist ON (artist.id = albums_artists_0.artist_id) LEFT OUTER JOIN albums_artists AS albums_artists_1 ON (albums_artists_1.artist_id = artist.id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.id = albums_artists_1.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_2 ON (albums_artists_2.album_id = albums_0.id) LEFT OUTER JOIN artists AS artist_0 ON (artist_0.id = albums_artists_2.artist_id) LEFT OUTER JOIN albums_artists AS albums_artists_3 ON (albums_artists_3.artist_id = artist_0.id) LEFT OUTER JOIN albums AS albums_1 ON (albums_1.id = albums_artists_3.album_id) LEFT OUTER JOIN albums_artists AS albums_artists_4 ON (albums_artists_4.album_id = albums_1.id) LEFT OUTER JOIN artists AS artist_1 ON (artist_1.id = albums_artists_4.artist_id)"
  end

  it "should respect the association's :order" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[:blah1, :blah2]
    @c1.order(Sequel[:artists][:blah2], Sequel[:artists][:blah3]).eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tag.blah1, tag.blah2'
  end

  it "should only qualify unqualified symbols, identifiers, or ordered versions in association's :order" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[Sequel.identifier(:blah__id), Sequel.identifier(:blah__id).desc, Sequel.desc(Sequel[:blah][:id]), Sequel[:blah][:id], :album_id, Sequel.desc(:album_id), 1, Sequel.lit('RANDOM()'), Sequel.qualify(:b, :a)]
    @c1.order(Sequel[:artists][:blah2], Sequel[:artists][:blah3]).eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tag.blah__id, tag.blah__id DESC, blah.id DESC, blah.id, tag.album_id, tag.album_id DESC, 1, RANDOM(), b.a'
  end

  with_symbol_splitting "should not qualify qualified symbols in association's :order" do
    @c1.one_through_many :tag, [[:albums_artists, :artist_id, :album_id], {:table=>:albums, :left=>:id, :right=>:id}, [:albums_tags, :album_id, :tag_id]], :order=>[Sequel.identifier(:blah__id), Sequel.identifier(:blah__id).desc, Sequel.desc(:blah__id), :blah__id, :album_id, Sequel.desc(:album_id), 1, Sequel.lit('RANDOM()'), Sequel.qualify(:b, :a)]
    @c1.order(:artists__blah2, :artists__blah3).eager_graph(:tag).sql.must_equal 'SELECT artists.id, tag.id AS tag_id FROM artists LEFT OUTER JOIN albums_artists ON (albums_artists.artist_id = artists.id) LEFT OUTER JOIN albums ON (albums.id = albums_artists.album_id) LEFT OUTER JOIN albums_tags ON (albums_tags.album_id = albums.id) LEFT OUTER JOIN tags AS tag ON (tag.id = albums_tags.tag_id) ORDER BY artists.blah2, artists.blah3, tag.blah__id, tag.blah__id DESC, blah.id DESC, blah.id, tag.album_id, tag.album_id DESC, 1, RANDOM(), b.a'
  end
end

describe "Sequel::Model.finalize_associations" do
  before do
    class ::Item < Sequel::Model
      plugin :many_through_many
      many_through_many :items, [[:foos, :item1_id, :foo1_id], [:bars, :foo2_id, :item2_id]]
      one_through_many :item, [[:foos, :item1_id, :foo1_id], [:bars, :foo2_id, :item2_id]]
      finalize_associations
    end
  end
  after do
    Object.send(:remove_const, :Item)
  end

  it "should finalize one_through_many associations" do
    r = Item.association_reflection(:item)
    r[:class].must_equal Item
    r[:_dataset].sql.must_equal "SELECT items.* FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id) LIMIT 1"
    r[:associated_eager_dataset].sql.must_equal "SELECT items.* FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id)"
    r[:filter_by_associations_conditions_dataset].sql.must_equal "SELECT foos.item1_id FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id) WHERE (foos.item1_id IS NOT NULL)"
    r[:placeholder_loader].wont_be_nil
    r[:predicate_key].must_equal Sequel.qualify(:foos, :item1_id)
    r[:associated_key_table].must_equal :foos
    r[:edges].must_equal [{:table=>:foos, :left=>:id, :right=>:item1_id, :conditions=>[], :join_type=>:left_outer, :block=>nil}, {:table=>:bars, :left=>:foo1_id, :right=>:foo2_id, :conditions=>[], :join_type=>:left_outer, :block=>nil}]
    r[:final_edge].must_equal(:table=>:items, :left=>:item2_id, :right=>:id, :conditions=>nil, :join_type=>nil, :block=>nil)
    r[:final_reverse_edge].must_equal(:table=>:foos, :left=>:foo1_id, :right=>:foo2_id, :alias=>:foos)
    r[:reverse_edges].must_equal [{:table=>:bars, :left=>:item2_id, :right=>:id, :alias=>:bars}]
  end

  it "should finalize many_through_many associations" do
    r = Item.association_reflection(:items)
    r[:class].must_equal Item
    r[:_dataset].sql.must_equal "SELECT items.* FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id)"
    r[:associated_eager_dataset].sql.must_equal "SELECT items.* FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id)"
    r[:filter_by_associations_conditions_dataset].sql.must_equal "SELECT foos.item1_id FROM items INNER JOIN bars ON (bars.item2_id = items.id) INNER JOIN foos ON (foos.foo1_id = bars.foo2_id) WHERE (foos.item1_id IS NOT NULL)"
    r[:placeholder_loader].wont_be_nil
    r[:predicate_key].must_equal Sequel.qualify(:foos, :item1_id)
    r[:associated_key_table].must_equal :foos
    r[:edges].must_equal [{:table=>:foos, :left=>:id, :right=>:item1_id, :conditions=>[], :join_type=>:left_outer, :block=>nil}, {:table=>:bars, :left=>:foo1_id, :right=>:foo2_id, :conditions=>[], :join_type=>:left_outer, :block=>nil}]
    r[:final_edge].must_equal(:table=>:items, :left=>:item2_id, :right=>:id, :conditions=>nil, :join_type=>nil, :block=>nil)
    r[:final_reverse_edge].must_equal(:table=>:foos, :left=>:foo1_id, :right=>:foo2_id, :alias=>:foos)
    r[:reverse_edges].must_equal [{:table=>:bars, :left=>:item2_id, :right=>:id, :alias=>:bars}]
  end
end
