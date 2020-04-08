require_relative "spec_helper"

describe "Sequel::Plugins::DatasetAssociations" do
  before do
    @db = Sequel.mock(:host=>'postgres')
    @db.extend_datasets do
      def quote_identifiers?; false end
      def supports_window_functions?; true; end
      def supports_distinct_on?; true; end
    end
    @Base = Class.new(Sequel::Model)
    @Base.plugin :dataset_associations

    @Artist = Class.new(@Base)
    @Album = Class.new(@Base)
    @Tag = Class.new(@Base)
    @Track = Class.new(@Base)

    def @Artist.name; 'Artist' end
    def @Album.name; 'Album' end
    def @Tag.name; 'Tag' end
    def @Track.name; 'Track' end

    @Artist.dataset = @db[:artists]
    @Album.dataset = @db[:albums]
    @Tag.dataset = @db[:tags]
    @Track.dataset = @db[:tracks]

    @Artist.columns :id, :name
    @Album.columns :id, :name, :artist_id
    @Tag.columns :id, :name

    @Album.plugin :many_through_many
    @Artist.plugin :many_through_many
    @Track.plugin :many_through_many
    @Artist.plugin :pg_array_associations
    @Tag.plugin :pg_array_associations
    @Artist.one_to_many :albums, :class=>@Album
    @Artist.one_to_one :first_album, :class=>@Album
    @Album.many_to_one :artist, :class=>@Artist
    @Album.many_to_many :tags, :class=>@Tag
    @Album.many_through_many :mthm_tags, [[:albums_tags, :album_id, :tag_id]], :class=>@Tag
    @Album.one_through_one :first_tag, :class=>@Tag, :right_key=>:tag_id
    @Tag.many_to_many :albums, :class=>@Album
    @Artist.pg_array_to_many :artist_tags, :class=>@Tag, :key=>:tag_ids
    @Tag.many_to_pg_array :artists, :class=>@Artist
    @Artist.many_through_many :tags, [[:albums, :artist_id, :id], [:albums_tags, :album_id, :tag_id]], :class=>@Tag
    @Artist.one_through_many :otag, [[:albums, :artist_id, :id], [:albums_tags, :album_id, :tag_id]], :class=>@Tag
    @Track.many_through_many :artist_tracks, [[:albums, :id, :artist_id], [:albums, :artist_id, :id]], :class=>@Track, :left_primary_key=>:album_id, :right_primary_key=>:album_id
  end

  it "should work for many_to_one associations" do
    ds = @Album.artists
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Artist
    ds.sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums.artist_id FROM albums))"
  end

  it "should work for one_to_many associations" do
    ds = @Artist.albums
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Album
    ds.sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists))"
  end

  it "should work for one_to_one associations" do
    ds = @Artist.first_albums
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Album
    ds.sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists))"
  end

  it "should work for many_to_many associations" do
    ds = @Album.tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id) IN (SELECT albums.id FROM albums))))"
  end

  it "should work for one_through_one associations" do
    ds = @Album.first_tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id) IN (SELECT albums.id FROM albums))))"
  end

  it "should work for many_through_many associations" do
    ds = @Artist.tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE (albums.artist_id IN (SELECT artists.id FROM artists))))"
  end

  it "should work for self referential many_through_many associations" do
    ds = @Track.artist_tracks
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Track
    ds.sql.must_equal "SELECT tracks.* FROM tracks WHERE (tracks.album_id IN (SELECT albums_0.id FROM tracks INNER JOIN albums ON (albums.id = tracks.album_id) INNER JOIN albums AS albums_0 ON (albums_0.artist_id = albums.artist_id) INNER JOIN tracks AS tracks_0 ON (tracks_0.album_id = albums_0.id) WHERE (albums.id IN (SELECT tracks.album_id FROM tracks))))"
  end

  it "should work for many_through_many associations with a single join table" do
    ds = @Album.mthm_tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (albums_tags.album_id IN (SELECT albums.id FROM albums))))"
  end

  it "should work for one_through_many associations" do
    ds = @Artist.otags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE (albums.artist_id IN (SELECT artists.id FROM artists))))"
  end

  it "should work for many_to_many associations with :dataset_association_join=>true" do
    @Album.many_to_many :tags, :clone=>:tags, :dataset_associations_join=>true, :select=>[Sequel.expr(:tags).*, Sequel[:albums_tags][:foo]]
    ds = @Album.tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.*, albums_tags.foo FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id) IN (SELECT albums.id FROM albums))))"
  end

  it "should work for one_through_one associations with :dataset_association_join=>true" do
    @Album.one_through_one :first_tag, :clone=>:first_tag, :dataset_associations_join=>true, :select=>[Sequel.expr(:tags).*, Sequel[:albums_tags][:foo]]
    ds = @Album.first_tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.*, albums_tags.foo FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id) IN (SELECT albums.id FROM albums))))"
  end

  it "should work for many_through_many associations with :dataset_association_join=>true" do
    @Artist.many_through_many :tags, :clone=>:tags, :dataset_associations_join=>true, :select=>[Sequel.expr(:tags).*, Sequel[:albums_tags][:foo]]
    ds = @Artist.tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.*, albums_tags.foo FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE (albums.artist_id IN (SELECT artists.id FROM artists))))"
  end

  it "should work for one_through_many associations with :dataset_association_join=>true" do
    @Artist.one_through_many :otag, :clone=>:otag, :dataset_associations_join=>true, :select=>[Sequel.expr(:tags).*, Sequel[:albums_tags][:foo]]
    ds = @Artist.otags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.*, albums_tags.foo FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE (albums.artist_id IN (SELECT artists.id FROM artists))))"
  end

  it "should work for pg_array_to_many associations" do
    ds = @Artist.artist_tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT * FROM tags WHERE (id IN (SELECT unnest(artists.tag_ids) FROM artists))"
  end

  it "should work for many_to_pg_array associations" do
    ds = @Tag.artists
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Artist
    ds.sql.must_equal "SELECT * FROM artists WHERE coalesce((tag_ids && (SELECT array_agg(tags.id) FROM tags)), false)"
  end

  it "should have an associated method that takes an association symbol" do
    ds = @Album.associated(:artist)
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Artist
    ds.sql.must_equal "SELECT * FROM artists WHERE (artists.id IN (SELECT albums.artist_id FROM albums))"
  end

  it "should raise an Error if an invalid association is given to associated" do
    proc{@Album.associated(:foo)}.must_raise(Sequel::Error)
  end

  it "should raise an Error if an unrecognized association type is used" do
    @Album.association_reflection(:artist)[:type] = :foo
    proc{@Album.artists}.must_raise(Sequel::Error)
  end

  it "should work correctly when chaining" do
    ds = @Artist.albums.tags
    ds.must_be_kind_of(Sequel::Dataset)
    ds.model.must_equal @Tag
    ds.sql.must_equal "SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id) IN (SELECT albums.id FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists))))))"
  end

  it "should deal correctly with filters before the association method" do
    @Artist.filter(:id=>1).albums.sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE (id = 1)))"
  end

  it "should deal correctly with filters after the association method" do
    @Artist.albums.filter(:id=>1).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (id = 1))"
  end

  it "should deal correctly with block on the association" do
    @Artist.one_to_many :albums, :clone=>:albums do |ds| ds.filter(:id=>1..100) end
    @Artist.albums.sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (id >= 1) AND (id <= 100))"
  end

  it "should deal correctly with :conditions option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :conditions=>{:id=>1..100}
    @Artist.albums.sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (id >= 1) AND (id <= 100))"
  end

  it "should deal correctly with :distinct option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :distinct=>true
    @Artist.albums.sql.must_equal "SELECT DISTINCT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists))"
  end

  it "should deal correctly with :eager option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :eager=>:tags
    @Artist.albums.opts[:eager].must_equal(:tags=>nil)
  end

  it "should deal correctly with :eager_block option on the association, ignoring the association block" do
    @Artist.one_to_many :albums, :clone=>:albums, :eager_block=>proc{|ds| ds.filter(:id=>1..100)} do |ds| ds.filter(:id=>2..200) end
    @Artist.albums.sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (id >= 1) AND (id <= 100))"
  end

  it "should deal correctly with :extend option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :extend=>Module.new{def foo(x) filter(:id=>x) end}
    @Artist.albums.foo(1).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (id = 1))"
  end

  it "should deal correctly with :order option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :order=>:name
    @Artist.albums.sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists)) ORDER BY name"
  end

  it "should deal correctly with :select option on the association" do
    @Artist.one_to_many :albums, :clone=>:albums, :select=>[:id, :name]
    @Artist.albums.sql.must_equal "SELECT id, name FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists))"
  end

  it "should deal correctly with :order option for one_to_one associations" do
    @Artist.one_to_one :first_album, :clone=>:first_album, :order=>:name
    @Artist.first_albums.sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (albums.id IN (SELECT DISTINCT ON (albums.artist_id) albums.id FROM albums ORDER BY albums.artist_id, name))) ORDER BY name'
  end

  it "should deal correctly with :limit option for one_to_many associations" do
    @Artist.one_to_many :albums, :clone=>:albums, :limit=>10, :order=>:name
    @Artist.albums.sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND (albums.id IN (SELECT id FROM (SELECT albums.id, row_number() OVER (PARTITION BY albums.artist_id ORDER BY name) AS x_sequel_row_number_x FROM albums) AS t1 WHERE (x_sequel_row_number_x <= 10)))) ORDER BY name'
  end

  it "should deal correctly with :order option for one_through_one associations" do
    @Album.one_through_one :first_tag, :clone=>:first_tag, :order=>Sequel[:tags][:name]
    @Album.first_tags.sql.must_equal 'SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (((albums_tags.album_id) IN (SELECT albums.id FROM albums)) AND ((albums_tags.album_id, tags.id) IN (SELECT DISTINCT ON (albums_tags.album_id) albums_tags.album_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) ORDER BY albums_tags.album_id, tags.name))))) ORDER BY tags.name'
  end

  it "should deal correctly with :limit option for many_to_many associations" do
    @Album.many_to_many :tags, :clone=>:tags, :limit=>10, :order=>Sequel[:tags][:name]
    @Album.tags.sql.must_equal 'SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (((albums_tags.album_id) IN (SELECT albums.id FROM albums)) AND ((albums_tags.album_id, tags.id) IN (SELECT b, c FROM (SELECT albums_tags.album_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums_tags.album_id ORDER BY tags.name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id)) AS t1 WHERE (x_sequel_row_number_x <= 10)))))) ORDER BY tags.name'
  end

  it "should deal correctly with :order option for one_through_many associations" do
    @Artist.one_through_many :otag, :clone=>:otag, :order=>Sequel[:tags][:name]
    @Artist.otags.sql.must_equal 'SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND ((albums.artist_id, tags.id) IN (SELECT DISTINCT ON (albums.artist_id) albums.artist_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id) ORDER BY albums.artist_id, tags.name))))) ORDER BY tags.name'
  end

  it "should deal correctly with :limit option for many_through_many associations" do
    @Artist.many_through_many :tags, :clone=>:tags, :limit=>10, :order=>Sequel[:tags][:name]
    @Artist.tags.sql.must_equal 'SELECT tags.* FROM tags WHERE (tags.id IN (SELECT albums_tags.tag_id FROM artists INNER JOIN albums ON (albums.artist_id = artists.id) INNER JOIN albums_tags ON (albums_tags.album_id = albums.id) INNER JOIN tags ON (tags.id = albums_tags.tag_id) WHERE ((albums.artist_id IN (SELECT artists.id FROM artists)) AND ((albums.artist_id, tags.id) IN (SELECT b, c FROM (SELECT albums.artist_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums.artist_id ORDER BY tags.name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) INNER JOIN albums ON (albums.id = albums_tags.album_id)) AS t1 WHERE (x_sequel_row_number_x <= 10)))))) ORDER BY tags.name'
  end
end

describe "Sequel::Plugins::DatasetAssociations with composite keys" do
  before do
    @db = Sequel.mock
    @db.extend_datasets do
      def supports_window_functions?; true; end
      def supports_distinct_on?; true; end
    end
    @Base = Class.new(Sequel::Model)
    @Base.plugin :dataset_associations

    @Artist = Class.new(@Base)
    @Album = Class.new(@Base)
    @Tag = Class.new(@Base)

    def @Artist.name; 'Artist' end
    def @Album.name; 'Album' end
    def @Tag.name; 'Tag' end

    @Artist.dataset = @db[:artists]
    @Album.dataset = @db[:albums]
    @Tag.dataset = @db[:tags]

    @Artist.set_primary_key([:id1, :id2])
    @Album.set_primary_key([:id1, :id2])
    @Tag.set_primary_key([:id1, :id2])

    @Artist.columns :id1, :id2, :name
    @Album.columns :id1, :id2, :name, :artist_id1, :artist_id2
    @Tag.columns :id1, :id2, :name

    @Artist.plugin :many_through_many
    @Artist.one_to_many :albums, :class=>@Album, :key=>[:artist_id1, :artist_id2]
    @Artist.one_to_one :first_album, :class=>@Album, :key=>[:artist_id1, :artist_id2]
    @Album.many_to_one :artist, :class=>@Artist, :key=>[:artist_id1, :artist_id2]
    @Album.many_to_many :tags, :class=>@Tag, :left_key=>[:album_id1, :album_id2], :right_key=>[:tag_id1, :tag_id2]
    @Album.one_through_one :first_tag, :class=>@Tag, :left_key=>[:album_id1, :album_id2], :right_key=>[:tag_id1, :tag_id2]
    @Tag.many_to_many :albums, :class=>@Album, :right_key=>[:album_id1, :album_id2], :left_key=>[:tag_id1, :tag_id2]
    @Artist.many_through_many :tags, [[:albums, [:artist_id1, :artist_id2], [:id1, :id2]], [:albums_tags, [:album_id1, :album_id2], [:tag_id1, :tag_id2]]], :class=>@Tag
    @Artist.one_through_many :otag, [[:albums, [:artist_id1, :artist_id2], [:id1, :id2]], [:albums_tags, [:album_id1, :album_id2], [:tag_id1, :tag_id2]]], :class=>@Tag
  end

  it "should work for many_to_one associations" do
    @Album.artists.sql.must_equal "SELECT * FROM artists WHERE ((artists.id1, artists.id2) IN (SELECT albums.artist_id1, albums.artist_id2 FROM albums))"
  end

  it "should work for one_to_many associations" do
    @Artist.albums.sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists))"
  end

  it "should work for one_to_one associations" do
    @Artist.first_albums.sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists))"
  end

  it "should work for many_to_many associations" do
    @Album.tags.sql.must_equal "SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) WHERE ((albums_tags.album_id1, albums_tags.album_id2) IN (SELECT albums.id1, albums.id2 FROM albums))))"
  end

  it "should work for one_through_one associations" do
    @Album.first_tags.sql.must_equal "SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) WHERE ((albums_tags.album_id1, albums_tags.album_id2) IN (SELECT albums.id1, albums.id2 FROM albums))))"
  end

  it "should work for many_through_many associations" do
    @Artist.tags.sql.must_equal "SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM artists INNER JOIN albums ON ((albums.artist_id1 = artists.id1) AND (albums.artist_id2 = artists.id2)) INNER JOIN albums_tags ON ((albums_tags.album_id1 = albums.id1) AND (albums_tags.album_id2 = albums.id2)) INNER JOIN tags ON ((tags.id1 = albums_tags.tag_id1) AND (tags.id2 = albums_tags.tag_id2)) WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists))))"
  end

  it "should work for one_through_many associations" do
    @Artist.otags.sql.must_equal "SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM artists INNER JOIN albums ON ((albums.artist_id1 = artists.id1) AND (albums.artist_id2 = artists.id2)) INNER JOIN albums_tags ON ((albums_tags.album_id1 = albums.id1) AND (albums_tags.album_id2 = albums.id2)) INNER JOIN tags ON ((tags.id1 = albums_tags.tag_id1) AND (tags.id2 = albums_tags.tag_id2)) WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists))))"
  end

  it "should work correctly when chaining" do
    @Artist.albums.tags.sql.must_equal "SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) WHERE ((albums_tags.album_id1, albums_tags.album_id2) IN (SELECT albums.id1, albums.id2 FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists))))))"
  end

  it "should deal correctly with :order option for one_to_one associations" do
    @Artist.one_to_one :first_album, :clone=>:first_album, :order=>:name
    @Artist.first_albums.sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists)) AND ((albums.id1, albums.id2) IN (SELECT DISTINCT ON (albums.artist_id1, albums.artist_id2) albums.id1, albums.id2 FROM albums ORDER BY albums.artist_id1, albums.artist_id2, name))) ORDER BY name'
  end

  it "should deal correctly with :limit option for one_to_many associations" do
    @Artist.one_to_many :albums, :clone=>:albums, :limit=>10, :order=>:name
    @Artist.albums.sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists)) AND ((albums.id1, albums.id2) IN (SELECT id1, id2 FROM (SELECT albums.id1, albums.id2, row_number() OVER (PARTITION BY albums.artist_id1, albums.artist_id2 ORDER BY name) AS x_sequel_row_number_x FROM albums) AS t1 WHERE (x_sequel_row_number_x <= 10)))) ORDER BY name'
  end

  it "should deal correctly with :order option for one_through_one associations" do
    @Album.one_through_one :first_tag, :clone=>:first_tag, :order=>Sequel[:tags][:name]
    @Album.first_tags.sql.must_equal 'SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) WHERE (((albums_tags.album_id1, albums_tags.album_id2) IN (SELECT albums.id1, albums.id2 FROM albums)) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id1, tags.id2) IN (SELECT DISTINCT ON (albums_tags.album_id1, albums_tags.album_id2) albums_tags.album_id1, albums_tags.album_id2, tags.id1, tags.id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) ORDER BY albums_tags.album_id1, albums_tags.album_id2, tags.name))))) ORDER BY tags.name'
  end

  it "should deal correctly with :limit option for many_to_many associations" do
    @Album.many_to_many :tags, :clone=>:tags, :limit=>10, :order=>Sequel[:tags][:name]
    @Album.tags.sql.must_equal 'SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) WHERE (((albums_tags.album_id1, albums_tags.album_id2) IN (SELECT albums.id1, albums.id2 FROM albums)) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id1, tags.id2) IN (SELECT b, c, d, e FROM (SELECT albums_tags.album_id1 AS b, albums_tags.album_id2 AS c, tags.id1 AS d, tags.id2 AS e, row_number() OVER (PARTITION BY albums_tags.album_id1, albums_tags.album_id2 ORDER BY tags.name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2))) AS t1 WHERE (x_sequel_row_number_x <= 10)))))) ORDER BY tags.name'
  end

  it "should deal correctly with :order option for one_through_many associations" do
    @Artist.one_through_many :otag, :clone=>:otag, :order=>Sequel[:tags][:name]
    @Artist.otags.sql.must_equal 'SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM artists INNER JOIN albums ON ((albums.artist_id1 = artists.id1) AND (albums.artist_id2 = artists.id2)) INNER JOIN albums_tags ON ((albums_tags.album_id1 = albums.id1) AND (albums_tags.album_id2 = albums.id2)) INNER JOIN tags ON ((tags.id1 = albums_tags.tag_id1) AND (tags.id2 = albums_tags.tag_id2)) WHERE (((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists)) AND ((albums.artist_id1, albums.artist_id2, tags.id1, tags.id2) IN (SELECT DISTINCT ON (albums.artist_id1, albums.artist_id2) albums.artist_id1, albums.artist_id2, tags.id1, tags.id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) INNER JOIN albums ON ((albums.id1 = albums_tags.album_id1) AND (albums.id2 = albums_tags.album_id2)) ORDER BY albums.artist_id1, albums.artist_id2, tags.name))))) ORDER BY tags.name'
  end

  it "should deal correctly with :limit option for many_through_many associations" do
    @Artist.many_through_many :tags, :clone=>:tags, :limit=>10, :order=>Sequel[:tags][:name]
    @Artist.tags.sql.must_equal 'SELECT tags.* FROM tags WHERE ((tags.id1, tags.id2) IN (SELECT albums_tags.tag_id1, albums_tags.tag_id2 FROM artists INNER JOIN albums ON ((albums.artist_id1 = artists.id1) AND (albums.artist_id2 = artists.id2)) INNER JOIN albums_tags ON ((albums_tags.album_id1 = albums.id1) AND (albums_tags.album_id2 = albums.id2)) INNER JOIN tags ON ((tags.id1 = albums_tags.tag_id1) AND (tags.id2 = albums_tags.tag_id2)) WHERE (((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists)) AND ((albums.artist_id1, albums.artist_id2, tags.id1, tags.id2) IN (SELECT b, c, d, e FROM (SELECT albums.artist_id1 AS b, albums.artist_id2 AS c, tags.id1 AS d, tags.id2 AS e, row_number() OVER (PARTITION BY albums.artist_id1, albums.artist_id2 ORDER BY tags.name) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.id1) AND (albums_tags.tag_id2 = tags.id2)) INNER JOIN albums ON ((albums.id1 = albums_tags.album_id1) AND (albums.id2 = albums_tags.album_id2))) AS t1 WHERE (x_sequel_row_number_x <= 10)))))) ORDER BY tags.name'
  end
end
