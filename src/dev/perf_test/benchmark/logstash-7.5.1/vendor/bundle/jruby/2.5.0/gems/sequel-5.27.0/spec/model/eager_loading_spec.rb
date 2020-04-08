require_relative "spec_helper"

describe Sequel::Model, "#eager" do
  before do
    class ::EagerAlbum < Sequel::Model(:albums)
      columns :id, :band_id
      many_to_one :band, :class=>'EagerBand', :key=>:band_id
      one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id
      many_to_many :genres, :class=>'EagerGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag
      one_through_one :genre, :clone=>:genres
      one_to_many :good_tracks, :class=>'EagerTrack', :reciprocal=>nil, :key=>:album_id do |ds|
        ds.filter(:name=>'Good')
      end
      many_to_one :band_name, :class=>'EagerBand', :key=>:band_id, :select=>[:id, :name]
      one_to_many :track_names, :class=>'EagerTrack', :key=>:album_id, :select=>[:id, :name]
      many_to_many :genre_names, :class=>'EagerGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :select=>[:id]

      def band_id3
        band_id*3
      end
    end

    class ::EagerBand < Sequel::Model(:bands)
      columns :id, :p_k
      one_to_many :albums, :class=>'EagerAlbum', :key=>:band_id, :eager=>:tracks, :reciprocal=>:band
      one_to_many :graph_albums, :class=>'EagerAlbum', :key=>:band_id, :eager_graph=>:tracks, :reciprocal=>nil
      many_to_many :members, :class=>'EagerBandMember', :left_key=>:band_id, :right_key=>:member_id, :join_table=>:bm
      many_to_many :graph_members, :clone=>:members, :eager_graph=>:bands
      one_to_many :good_albums, :class=>'EagerAlbum', :key=>:band_id, :reciprocal=>nil, :eager_block=>proc{|ds| ds.filter(:name=>'good')} do |ds|
        ds.filter(:name=>'Good')
      end
      one_to_many :self_titled_albums, :class=>'EagerAlbum', :key=>:band_id, :allow_eager=>false do |ds|
        ds.filter(:name=>name)
      end
      one_to_many :albums_by_name, :class=>'EagerAlbum', :key=>:band_id, :order=>:name, :allow_eager=>false
      one_to_many :top_10_albums, :class=>'EagerAlbum', :key=>:band_id, :limit=>10

      def id3
        id/3
      end
    end
    
    class ::EagerTrack < Sequel::Model(:tracks)
      columns :id, :album_id
      many_to_one :album, :class=>'EagerAlbum', :key=>:album_id
    end
    
    class ::EagerGenre < Sequel::Model(:genres)
      columns :id, :xxx
      many_to_many :albums, :class=>'EagerAlbum', :left_key=>:genre_id, :right_key=>:album_id, :join_table=>:ag
    end
    
    class ::EagerBandMember < Sequel::Model(:members)
      columns :id
      many_to_many :bands, :class=>'EagerBand', :left_key=>:member_id, :right_key=>:band_id, :join_table=>:bm, :order =>:id
    end
    
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch(proc do |sql|
      h = if sql =~ /101/
        {:id => 101, :band_id=> 101}
      else
        {:id => 1, :band_id=> 2}
      end
      h[:x_foreign_key_x] = 4 if sql =~ /ag\.genre_id/
      h
    end)
    EagerAlbum.dataset.columns(:id, :band_id)

    EagerBand.dataset = EagerBand.dataset.with_fetch(proc do |sql|
      case sql
      when /id IN (101)/
        # nothing
      when /id > 100/
        [{:id => 101}, {:id => 102}]
      else
        h = {:id => 2}
        h[:x_foreign_key_x] = 5 if sql =~ /bm\.member_id/
        h
      end
    end)
    
    EagerTrack.dataset = EagerTrack.dataset.with_fetch(:id => 3, :album_id => 1)
    
    EagerGenre.dataset = EagerGenre.dataset.with_fetch(proc do |sql|
      h = {:id => 4}
      h[:x_foreign_key_x] = 1 if sql =~ /ag\.album_id/
      h
    end)
    
    EagerBandMember.dataset = EagerBandMember.dataset.with_fetch(proc do |sql|
      h = {:id => 5}
      h[:x_foreign_key_x] = 2 if sql =~ /bm\.band_id/
      h
    end)

    DB.reset
  end
  after do
    [:EagerAlbum, :EagerBand, :EagerTrack, :EagerGenre, :EagerBandMember].each{|x| Object.send(:remove_const, x)}
  end
  
  it "should populate :key_hash and :id_map option correctly for custom eager loaders" do
    khs = {}
    pr = proc{|a, m| proc{|h| khs[a] = h[:key_hash][m]; h[:id_map].must_equal h[:key_hash][m]}}
    EagerAlbum.many_to_one :sband, :clone=>:band, :eager_loader=>pr.call(:sband, :band_id)
    EagerAlbum.one_to_many :stracks, :clone=>:tracks, :eager_loader=>pr.call(:stracks, :id)
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :eager_loader=>pr.call(:sgenres, :id)
    EagerAlbum.eager(:sband, :stracks, :sgenres).all
    khs.must_equal(:sband=>{2=>[EagerAlbum.load(:band_id=>2, :id=>1)]}, :stracks=>{1=>[EagerAlbum.load(:band_id=>2, :id=>1)]}, :sgenres=>{1=>[EagerAlbum.load(:band_id=>2, :id=>1)]})
  end

  it "should populate :key_hash using the method symbol" do
    khs = {}
    pr = proc{|a, m| proc{|h| khs[a] = h[:key_hash][m]}}
    EagerAlbum.many_to_one :sband, :clone=>:band, :eager_loader=>pr.call(:sband, :band_id), :key=>:band_id, :key_column=>:b_id
    EagerAlbum.one_to_many :stracks, :clone=>:tracks, :eager_loader=>pr.call(:stracks, :id), :primary_key=>:id, :primary_key_column=>:i
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :eager_loader=>pr.call(:sgenres, :id), :left_primary_key=>:id, :left_primary_key_column=>:i
    EagerAlbum.eager(:sband, :stracks, :sgenres).all
    khs.must_equal(:sband=>{2=>[EagerAlbum.load(:band_id=>2, :id=>1)]}, :stracks=>{1=>[EagerAlbum.load(:band_id=>2, :id=>1)]}, :sgenres=>{1=>[EagerAlbum.load(:band_id=>2, :id=>1)]})
  end

  it "should raise an error if called without a symbol or hash" do
    proc{EagerAlbum.eager(Object.new)}.must_raise(Sequel::Error)
  end

  it "should eagerly load a single many_to_one association" do
    a = EagerAlbum.eager(:band).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE (bands.id IN (2))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.band.must_equal EagerBand.load(:id=>2)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load when using to_hash" do
    h = EagerAlbum.eager(:band).to_hash
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE (bands.id IN (2))']
    h.must_equal(1=>EagerAlbum.load(:id => 1, :band_id => 2))
    h[1].band.must_equal EagerBand.load(:id=>2)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load when using to_hash_groups" do
    h = EagerAlbum.eager(:band).to_hash_groups(:id)
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE (bands.id IN (2))']
    h.must_equal(1=>[EagerAlbum.load(:id => 1, :band_id => 2)])
    h[1].first.band.must_equal EagerBand.load(:id=>2)
    DB.sqls.must_equal []
  end
  
  it "should skip eager loading for a many_to_one association with no matching keys" do
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch([{:id=>1, :band_id=>nil}])
    a = EagerAlbum.eager(:band).all
    DB.sqls.must_equal ['SELECT * FROM albums']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => nil)]
    a.first.associations.fetch(:band).must_be_nil
    a.first.band.must_be_nil
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single many_to_one association with the same name as the column" do
    EagerAlbum.def_column_alias(:band_id_id, :band_id)
    EagerAlbum.many_to_one :band_id, :key_column=>:band_id, :class=>EagerBand
    a = EagerAlbum.eager(:band_id).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE (bands.id IN (2))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.band_id.must_equal EagerBand.load(:id=>2)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_one association" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should not break if the dataset does not have a row proc" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id
    a = EagerAlbum.eager(:track).naked.all
    a.must_equal [{:id => 1, :band_id => 2}]
    DB.sqls.must_equal ['SELECT * FROM albums']
  end
  
  it "should eagerly load a single one_to_one association without an order" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:id => 3, :album_id=>1}, {:id => 4, :album_id=>1}])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_one association with an order" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:a
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY a LIMIT 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_one association using the :distinct_on strategy" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_distinct_on?; true end}
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:a, :eager_limit_strategy=>:distinct_on
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT DISTINCT ON (tracks.album_id) * FROM tracks WHERE (tracks.album_id IN (1)) ORDER BY tracks.album_id, a']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_one association using the :window_function strategy" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :eager_limit_strategy=>:window_function
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x = 1)']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_one association using the :window_function strategy on MySQL" do
    odb = DB
    db = Class.new do
      def database_type; :mysql; end
      define_method(:method_missing) do |*args, &block|
        odb.send(*args, &block)
      end
    end.new

    begin
      EagerTrack.dataset = EagerTrack.dataset.with_extend do
        def supports_window_functions?; true end
        define_method(:db){db}
      end
      EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :eager_limit_strategy=>:window_function
      a = EagerAlbum.eager(:track).all
      a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
      DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x = 1) ORDER BY x_sequel_row_number_x']
      a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
      DB.sqls.must_equal []
    ensure
      db = DB
    end
  end
  
  it "should automatically use an eager limit stategy if the association has an offset" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :limit=>[1,1]
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:id => 4, :album_id=>1}])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 4, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should handle offsets when using the :ruby eager limit stategy" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :limit=>[1,1], :eager_limit_strategy=>:ruby
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:id => 3, :album_id=>1}, {:id => 4, :album_id=>1}])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 4, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should support a :subqueries_per_union option for the number of subqueries in a union" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :limit=>[1,1], :subqueries_per_union=>1
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch([{:id => 1, :band_id => 2}, {:id => 2, :band_id => 3}, {:id => 3, :band_id => 4}])
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([[{:id => 4, :album_id=>1}], [{:id=>5, :album_id=>2}], [{:id=>6, :album_id=>3}]])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2), EagerAlbum.load(:id => 2, :band_id => 3), EagerAlbum.load(:id => 3, :band_id => 4)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1', 'SELECT * FROM (SELECT * FROM tracks WHERE (2 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1', 'SELECT * FROM (SELECT * FROM tracks WHERE (3 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 4, :album_id=>1)
    DB.sqls.must_equal []

    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :limit=>[1,1], :subqueries_per_union=>2
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([[{:id => 4, :album_id=>1}, {:id=>5, :album_id=>2}], [{:id=>6, :album_id=>3}]])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2), EagerAlbum.load(:id => 2, :band_id => 3), EagerAlbum.load(:id => 3, :band_id => 4)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1 UNION ALL SELECT * FROM (SELECT * FROM tracks WHERE (2 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1', 'SELECT * FROM (SELECT * FROM tracks WHERE (3 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 4, :album_id=>1)
    DB.sqls.must_equal []

    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :limit=>[1,1], :subqueries_per_union=>3
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([[{:id => 4, :album_id=>1}, {:id=>5, :album_id=>2}, {:id=>6, :album_id=>3}]])
    a = EagerAlbum.eager(:track).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2), EagerAlbum.load(:id => 2, :band_id => 3), EagerAlbum.load(:id => 3, :band_id => 4)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1 UNION ALL SELECT * FROM (SELECT * FROM tracks WHERE (2 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1 UNION ALL SELECT * FROM (SELECT * FROM tracks WHERE (3 = tracks.album_id) LIMIT 1 OFFSET 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 4, :album_id=>1)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_to_many association" do
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_through_one association" do
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end
  
  it "should use first matching entry when eager loading one_through_one association" do
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:id => 3, :x_foreign_key_x=>1}, {:id => 4, :x_foreign_key_x=>1}])
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genre.must_equal EagerGenre.load(:id=>3)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_through_one association" do
    EagerAlbum.one_through_one :genre, :clone=>:genre, :order=>:a
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (1 = ag.album_id) ORDER BY a LIMIT 1) AS t1"]
    a.first.genre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_through_one association using the :distinct_on strategy" do
    EagerGenre.dataset = EagerGenre.dataset.with_extend{def supports_distinct_on?; true end}
    EagerAlbum.one_through_one :genre, :clone=>:genre, :order=>:a, :eager_limit_strategy=>:distinct_on
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT DISTINCT ON (ag.album_id) genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1)) ORDER BY ag.album_id, a"]
    a.first.genre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single one_through_one association using the :window_function strategy" do
    EagerGenre.dataset = EagerGenre.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_through_one :genre, :clone=>:genre, :eager_limit_strategy=>:window_function
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x = 1)"]
    a.first.genre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end
  
  it "should automatically use an eager limit stategy if the association has an offset" do
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:id => 3, :x_foreign_key_x=>1}, {:id => 4, :x_foreign_key_x=>1}])
    a = EagerAlbum.eager(:genre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genre.must_equal EagerGenre.load(:id=>3)
    DB.sqls.must_equal []
  end
  
  it "should eagerly load a single many_to_many association" do
    a = EagerAlbum.eager(:genres).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genres.must_equal [EagerGenre.load(:id=>4)]
    DB.sqls.must_equal []
  end
  
  it "should support using a custom :key option when eager loading many_to_one associations" do
    EagerAlbum.many_to_one :sband, :clone=>:band, :key=>:band_id3
    EagerBand.dataset = EagerBand.dataset.with_fetch(:id=>6)
    a = EagerAlbum.eager(:sband).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE (bands.id IN (6))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.sband.must_equal EagerBand.load(:id=>6)
    DB.sqls.must_equal []
  end
  
  it "should support using a custom :primary_key option when eager loading one_to_many associations" do
    EagerBand.one_to_many :salbums, :clone=>:albums, :primary_key=>:id3, :eager=>nil, :reciprocal=>nil
    EagerBand.dataset = EagerBand.dataset.with_fetch(:id=>6)
    a = EagerBand.eager(:salbums).all
    DB.sqls.must_equal ['SELECT * FROM bands', 'SELECT * FROM albums WHERE (albums.band_id IN (2))']
    a.must_equal [EagerBand.load(:id => 6)]
    a.first.salbums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal []
  end

  it "should support using a custom :left_primary_key option when eager loading many_to_many associations" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :left_primary_key=>:band_id3
    EagerGenre.dataset = EagerGenre.dataset.with_fetch(:id=>4, :x_foreign_key_x=>6)
    a = EagerAlbum.eager(:sgenres).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (6))"]
    a.first.sgenres.must_equal [EagerGenre.load(:id=>4)]
    DB.sqls.must_equal []
  end

  it "should support using a custom :left_primary_key option when eager loading one_through_one associations" do
    EagerAlbum.one_through_one :sgenre, :clone=>:genre, :left_primary_key=>:band_id3
    EagerGenre.dataset = EagerGenre.dataset.with_fetch(:id=>4, :x_foreign_key_x=>6)
    a = EagerAlbum.eager(:sgenre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (6))"]
    a.first.sgenre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end

  it "should handle a :predicate_key option to change the SQL used in the lookup, for many_to_one associations" do
    EagerAlbum.many_to_one :sband, :clone=>:band, :predicate_key=>(Sequel[:bands][:id] / 3), :primary_key_method=>:id3
    EagerBand.dataset = EagerBand.dataset.with_fetch(:id=>6)
    a = EagerAlbum.eager(:sband).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM bands WHERE ((bands.id / 3) IN (2))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.sband.must_equal EagerBand.load(:id=>6)
    DB.sqls.must_equal []
  end
  
  it "should handle a :predicate_key option to change the SQL used in the lookup, for one_to_many associations" do
    EagerBand.one_to_many :salbums, :clone=>:albums, :predicate_key=>(Sequel[:albums][:band_id] * 3), :key_method=>:band_id3, :eager=>nil, :reciprocal=>nil
    EagerBand.dataset = EagerBand.dataset.with_fetch(:id=>6)
    a = EagerBand.eager(:salbums).all
    DB.sqls.must_equal ['SELECT * FROM bands', 'SELECT * FROM albums WHERE ((albums.band_id * 3) IN (6))']
    a.must_equal [EagerBand.load(:id => 6)]
    a.first.salbums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal []
  end
  
  it "should handle a :predicate_key option to change the SQL used in the lookup, for many_to_many associations" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :predicate_key=>(Sequel[:ag][:album_id] * 1)
    a = EagerAlbum.eager(:sgenres).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, (ag.album_id * 1) AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE ((ag.album_id * 1) IN (1))"]
    a.first.sgenres.must_equal [EagerGenre.load(:id=>4)]
    DB.sqls.must_equal []
  end

  it "should handle a :predicate_key option to change the SQL used in the lookup, for one_through_one associations" do
    EagerAlbum.one_through_one :sgenre, :clone=>:genre, :predicate_key=>(Sequel[:ag][:album_id] * 1)
    a = EagerAlbum.eager(:sgenre).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, (ag.album_id * 1) AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE ((ag.album_id * 1) IN (1))"]
    a.first.sgenre.must_equal EagerGenre.load(:id=>4)
    DB.sqls.must_equal []
  end

  it "should raise an error for an unhandled :eager_loader_key option" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :eager_loader_key=>1
    ds = EagerAlbum.eager(:sgenres)
    proc{ds.all}.must_raise(Sequel::Error)
  end
  
  it "should not add entry to key_hash for :eager_loader_key=>nil option" do
    eo = nil
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :eager_loader_key=>nil, :eager_loader=>proc{|o| eo = o}
    ds = EagerAlbum.eager(:sgenres)
    ds.all
    eo[:key_hash].must_equal({})
    eo[:id_map].must_be_nil
  end
  
  it "should correctly handle a :select=>[] option to many_to_many" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :select=>[]
    EagerAlbum.eager(:sgenres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT *, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
  end
  
  it "should correctly handle a :select=>[] option to one_through_one" do
    EagerAlbum.one_through_one :sgenre, :clone=>:genre, :select=>[]
    EagerAlbum.eager(:sgenre).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT *, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
  end
  
  with_symbol_splitting "should correctly handle an aliased join table symbol in many_to_many" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :join_table=>:ag___ga
    EagerAlbum.eager(:sgenres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ga.album_id AS x_foreign_key_x FROM genres INNER JOIN ag AS ga ON (ga.genre_id = genres.id) WHERE (ga.album_id IN (1))"]
  end
  
  with_symbol_splitting "should correctly handle an aliased join table symbol in one_through_one" do
    EagerAlbum.one_through_one :sgenre, :clone=>:genre, :join_table=>:ag___ga
    EagerAlbum.eager(:sgenre).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ga.album_id AS x_foreign_key_x FROM genres INNER JOIN ag AS ga ON (ga.genre_id = genres.id) WHERE (ga.album_id IN (1))"]
  end
  
  it "should correctly handle an aliased join table in many_to_many" do
    EagerAlbum.many_to_many :sgenres, :clone=>:genres, :join_table=>Sequel[:ag].as(:ga)
    EagerAlbum.eager(:sgenres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ga.album_id AS x_foreign_key_x FROM genres INNER JOIN ag AS ga ON (ga.genre_id = genres.id) WHERE (ga.album_id IN (1))"]
  end
  
  it "should correctly handle an aliased join table in one_through_one" do
    EagerAlbum.one_through_one :sgenre, :clone=>:genre, :join_table=>Sequel[:ag].as(:ga)
    EagerAlbum.eager(:sgenre).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ga.album_id AS x_foreign_key_x FROM genres INNER JOIN ag AS ga ON (ga.genre_id = genres.id) WHERE (ga.album_id IN (1))"]
  end
  
  it "should eagerly load multiple associations in a single call" do
    a = EagerAlbum.eager(:genres, :tracks, :band).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    sqls = DB.sqls
    sqls.shift.must_equal 'SELECT * FROM albums'
    sqls.sort.must_equal ['SELECT * FROM bands WHERE (bands.id IN (2))',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))',
      'SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))']
    a = a.first
    a.band.must_equal EagerBand.load(:id=>2)
    a.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    a.genres.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal []
  end
  
  it "should eagerly load multiple associations in separate calls" do
    a = EagerAlbum.eager(:genres).eager(:tracks).eager(:band).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    sqls = DB.sqls
    sqls.shift.must_equal 'SELECT * FROM albums'
    sqls.sort.must_equal ['SELECT * FROM bands WHERE (bands.id IN (2))',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))',
      'SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))']
    a = a.first
    a.band.must_equal EagerBand.load(:id=>2)
    a.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    a.genres.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal []
  end
  
  it "should allow cascading of eager loading for associations of associated models" do
    a = EagerTrack.eager(:album=>{:band=>:members}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ['SELECT * FROM tracks', 
      'SELECT * FROM albums WHERE (albums.id IN (1))',
      'SELECT * FROM bands WHERE (bands.id IN (2))',
      "SELECT members.*, bm.band_id AS x_foreign_key_x FROM members INNER JOIN bm ON (bm.member_id = members.id) WHERE (bm.band_id IN (2))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.band.members.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal []
  end
  
  it "should cascade eager loading when using a UNION strategy for eager loading limited associations" do
    EagerTrack.many_to_one :album2, :clone=>:album
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:a
    a = EagerAlbum.eager(:track=>:album2).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY a LIMIT 1) AS t1', 'SELECT * FROM albums WHERE (albums.id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    a.first.track.album2.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    DB.sqls.must_equal []

    a = EagerAlbum.eager(:track=>[:album2]).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY a LIMIT 1) AS t1', 'SELECT * FROM albums WHERE (albums.id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    a.first.track.album2.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    DB.sqls.must_equal []

    a = EagerAlbum.eager(:track=>{:album2=>:track}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY a LIMIT 1) AS t1', 'SELECT * FROM albums WHERE (albums.id IN (1))', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY a LIMIT 1) AS t1']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    a.first.track.album2.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.first.track.album2.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end

  it "should call post_load when eager loading limited associations" do
    EagerTrack.many_to_one :album2, :clone=>:album
    a = []
    m = Module.new do
      define_method(:post_load) do |objs|
        a << 1
        super(objs)
      end
    end
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:a, :extend=>m
    EagerAlbum.eager(:track).all
    a.must_equal [1]
  end
  
  it "should cascade eagerly loading when the :eager association option is used" do
    a = EagerBand.eager(:albums).all
    a.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM bands', 
      'SELECT * FROM albums WHERE (albums.band_id IN (2))',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.albums.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal []
  end
  
  it "should respect :eager when lazily loading an association" do
    a = EagerBand.all
    a.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM bands']
    a = a.first.albums
    DB.sqls.must_equal ['SELECT * FROM albums WHERE (albums.band_id = 2)',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal []
  end
  
  it "should respect :eager with cascaded hash when lazily loading an association" do
    EagerBand.one_to_many :albums, :eager=>{:tracks=>:album}, :clone=>:albums
    a = EagerBand.all
    a.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM bands']
    a = a.first.albums
    DB.sqls.must_equal ['SELECT * FROM albums WHERE (albums.band_id = 2)',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))',
      'SELECT * FROM albums WHERE (albums.id IN (1))']
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    a.first.tracks.first.album.must_equal a.first
    DB.sqls.must_equal []
  end
  
  it "should cascade eagerly loading when the :eager_graph association option is used" do
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch(:id=>1, :band_id=>2, :tracks_id=>3, :album_id=>1)
    EagerAlbum.dataset.columns(:id, :band_id)
    EagerTrack.dataset.columns(:id, :album_id)
    a = EagerBand.eager(:graph_albums).all
    a.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM bands', 
      'SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) WHERE (albums.band_id IN (2))']
    a.first.graph_albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.first.graph_albums.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal []
  end
  
  it "should raise an Error when eager loading a many_to_many association with the :eager_graph option" do
    proc{EagerBand.eager(:graph_members).all}.must_raise(Sequel::Error)
  end
  
  it "should respect :eager_graph when lazily loading an association" do
    a = EagerBand.all
    a.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal ['SELECT * FROM bands']
    a = a.first
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch(:id=>1, :band_id=>2, :tracks_id=>3, :album_id=>1)
    EagerAlbum.dataset.columns(:id, :band_id)
    EagerTrack.dataset.columns(:id, :album_id)
    a.graph_albums
    DB.sqls.must_equal ['SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) WHERE (albums.band_id = 2)']
    a.graph_albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.graph_albums.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal []
  end
  
  it "should respect :eager_graph when lazily loading a many_to_many association" do
    EagerBandMember.dataset = EagerBandMember.dataset.with_fetch([{:id=>5, :bands_id=>2, :p_k=>6}, {:id=>5, :bands_id=>3, :p_k=>6}]).with_extend{def columns; [:id] end}
    a = EagerBand.load(:id=>2)
    EagerBand.dataset.columns(:id, :p_k)
    a.graph_members.must_equal [EagerBandMember.load(:id=>5)]
    DB.sqls.must_equal ['SELECT members.id, bands.id AS bands_id, bands.p_k FROM (SELECT members.* FROM members INNER JOIN bm ON (bm.member_id = members.id) WHERE (bm.band_id = 2)) AS members LEFT OUTER JOIN bm AS bm_0 ON (bm_0.member_id = members.id) LEFT OUTER JOIN bands ON (bands.id = bm_0.band_id) ORDER BY bands.id']
    a.graph_members.first.bands.must_equal [EagerBand.load(:id=>2, :p_k=>6), EagerBand.load(:id=>3, :p_k=>6)]
    DB.sqls.must_equal []
  end
  
  it "should respect :conditions when eagerly loading" do
    EagerBandMember.many_to_many :good_bands, :clone=>:bands, :conditions=>{:a=>32}
    a = EagerBandMember.eager(:good_bands).all
    a.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal ['SELECT * FROM members', 'SELECT bands.*, bm.member_id AS x_foreign_key_x FROM bands INNER JOIN bm ON (bm.band_id = bands.id) WHERE ((a = 32) AND (bm.member_id IN (5))) ORDER BY id']
    a.first.good_bands.must_equal [EagerBand.load(:id => 2)]
    DB.sqls.must_equal []

    EagerBandMember.many_to_many :good_bands, :clone=>:bands, :conditions=>Sequel.lit("x = 1")
    a = EagerBandMember.eager(:good_bands).all
    DB.sqls.must_equal ['SELECT * FROM members', 'SELECT bands.*, bm.member_id AS x_foreign_key_x FROM bands INNER JOIN bm ON (bm.band_id = bands.id) WHERE ((x = 1) AND (bm.member_id IN (5))) ORDER BY id']
  end
  
  it "should respect :order when eagerly loading" do
    a = EagerBandMember.eager(:bands).all
    a.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal ['SELECT * FROM members', 'SELECT bands.*, bm.member_id AS x_foreign_key_x FROM bands INNER JOIN bm ON (bm.band_id = bands.id) WHERE (bm.member_id IN (5)) ORDER BY id']
    a.first.bands.must_equal [EagerBand.load(:id => 2)]
    DB.sqls.must_equal []
  end
  
  it "should populate the reciprocal many_to_one association when eagerly loading the one_to_many association" do
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    a.first.tracks.first.album.must_equal a.first
    DB.sqls.must_equal []
  end

  it "should cache the negative lookup when eagerly loading a many_to_one association" do
    a = EagerAlbum.eager(:band).filter(:id=>101).all
    a.must_equal [EagerAlbum.load(:id => 101, :band_id => 101)]
    DB.sqls.must_equal ['SELECT * FROM albums WHERE (id = 101)', 'SELECT * FROM bands WHERE (bands.id IN (101))']
    a.first.associations.fetch(:band, 2).must_be_nil
    a.first.band.must_be_nil
    DB.sqls.must_equal []
  end
  
  it "should cache the negative lookup when eagerly loading a *_to_many associations" do
    a = EagerBand.eager(:albums).where{id > 100}.all
    a.must_equal [EagerBand.load(:id => 101), EagerBand.load(:id =>102)]
    DB.sqls.must_equal ['SELECT * FROM bands WHERE (id > 100)',
      'SELECT * FROM albums WHERE (albums.band_id IN (101, 102))',
      "SELECT * FROM tracks WHERE (tracks.album_id IN (101))"]
    a.map{|b| b.associations[:albums]}.must_equal [[EagerAlbum.load({:band_id=>101, :id=>101})], []]
    DB.sqls.must_equal []
  end
  
  it "should use the association's block when eager loading by default" do
    EagerAlbum.eager(:good_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE ((name = 'Good') AND (tracks.album_id IN (1)))"]
  end

  it "should use the eager_block option when eager loading if given" do
    EagerBand.eager(:good_albums).all
    DB.sqls.must_equal ['SELECT * FROM bands', "SELECT * FROM albums WHERE ((name = 'good') AND (albums.band_id IN (2)))"]
    EagerBand.eager(:good_albums=>:good_tracks).all
    DB.sqls.must_equal ['SELECT * FROM bands', "SELECT * FROM albums WHERE ((name = 'good') AND (albums.band_id IN (2)))", "SELECT * FROM tracks WHERE ((name = 'Good') AND (tracks.album_id IN (1)))"]
  end

  it "should raise an error when attempting to eagerly load an association with the :allow_eager option set to false" do
    proc{EagerBand.eager(:self_titled_albums).all}.must_raise(Sequel::Error)
    proc{EagerBand.eager(:albums_by_name).all}.must_raise(Sequel::Error)
  end

  it "should respect the association's :select option" do
    EagerAlbum.eager(:band_name).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT id, name FROM bands WHERE (bands.id IN (2))"]
    EagerAlbum.eager(:track_names).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT id, name FROM tracks WHERE (tracks.album_id IN (1))"]
    EagerAlbum.eager(:genre_names).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT id, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
  end

  it "should respect many_to_one association's :qualify option" do
    EagerAlbum.many_to_one :special_band, :class=>:EagerBand, :qualify=>false, :key=>:band_id
    EagerBand.dataset = EagerBand.dataset.with_fetch(:id=>2)
    as = EagerAlbum.eager(:special_band).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM bands WHERE (id IN (2))"]
    as.map{|a| a.special_band}.must_equal [EagerBand.load(:id=>2)]
    DB.sqls.must_equal []
  end

  it "should respect the association's :primary_key option" do
    EagerAlbum.many_to_one :special_band, :class=>:EagerBand, :primary_key=>:p_k, :key=>:band_id
    EagerBand.dataset = EagerBand.dataset.with_fetch(:p_k=>2, :id=>1)
    as = EagerAlbum.eager(:special_band).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM bands WHERE (bands.p_k IN (2))"]
    as.length.must_equal 1
    as.first.special_band.must_equal EagerBand.load(:p_k=>2, :id=>1)

    EagerAlbum.one_to_many :special_tracks, :class=>:EagerTrack, :primary_key=>:band_id, :key=>:album_id, :reciprocal=>nil
    EagerTrack.dataset = EagerTrack.dataset.with_fetch(:album_id=>2, :id=>1)
    as = EagerAlbum.eager(:special_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE (tracks.album_id IN (2))"]
    as.length.must_equal 1
    as.first.special_tracks.must_equal [EagerTrack.load(:album_id=>2, :id=>1)]
  end
  
  it "should respect the many_to_one association's composite keys" do
    EagerAlbum.many_to_one :special_band, :class=>:EagerBand, :primary_key=>[:id, :p_k], :key=>[:band_id, :id]
    EagerBand.dataset = EagerBand.dataset.with_fetch(:p_k=>1, :id=>2)
    as = EagerAlbum.eager(:special_band).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM bands WHERE ((bands.id, bands.p_k) IN ((2, 1)))"]
    as.length.must_equal 1
    as.first.special_band.must_equal EagerBand.load(:p_k=>1, :id=>2)
  end
  
  it "should respect the one_to_many association's composite keys" do
    EagerAlbum.one_to_many :special_tracks, :class=>:EagerTrack, :primary_key=>[:band_id, :id], :key=>[:id, :album_id]
    EagerTrack.dataset = EagerTrack.dataset.with_fetch(:album_id=>1, :id=>2)
    as = EagerAlbum.eager(:special_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE ((tracks.id, tracks.album_id) IN ((2, 1)))"]
    as.length.must_equal 1
    as.first.special_tracks.must_equal [EagerTrack.load(:album_id=>1, :id=>2)]
  end

  it "should respect many_to_many association's composite keys" do
    EagerAlbum.many_to_many :special_genres, :class=>:EagerGenre, :left_primary_key=>[:band_id, :id], :left_key=>[:l1, :l2], :right_primary_key=>[:xxx, :id], :right_key=>[:r1, :r2], :join_table=>:ag
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_0_x=>2, :x_foreign_key_1_x=>1, :id=>5}, {:x_foreign_key_0_x=>2, :x_foreign_key_1_x=>1, :id=>6}])
    as = EagerAlbum.eager(:special_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.l1 AS x_foreign_key_0_x, ag.l2 AS x_foreign_key_1_x FROM genres INNER JOIN ag ON ((ag.r1 = genres.xxx) AND (ag.r2 = genres.id)) WHERE ((ag.l1, ag.l2) IN ((2, 1)))"]
    as.length.must_equal 1
    as.first.special_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]
  end
  
  it "should respect one_through_one association's composite keys" do
    EagerAlbum.one_through_one :special_genre, :class=>:EagerGenre, :left_primary_key=>[:band_id, :id], :left_key=>[:l1, :l2], :right_primary_key=>[:xxx, :id], :right_key=>[:r1, :r2], :join_table=>:ag
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_0_x=>2, :x_foreign_key_1_x=>1, :id=>5}])
    as = EagerAlbum.eager(:special_genre).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.l1 AS x_foreign_key_0_x, ag.l2 AS x_foreign_key_1_x FROM genres INNER JOIN ag ON ((ag.r1 = genres.xxx) AND (ag.r2 = genres.id)) WHERE ((ag.l1, ag.l2) IN ((2, 1)))"]
    as.length.must_equal 1
    as.first.special_genre.must_equal EagerGenre.load(:id=>5)
  end
  
  it "should respect many_to_many association's :left_primary_key and :right_primary_key options" do
    EagerAlbum.many_to_many :special_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_primary_key=>:xxx, :right_key=>:genre_id, :join_table=>:ag
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}])
    as = EagerAlbum.eager(:special_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.xxx) WHERE (ag.album_id IN (2))"]
    as.length.must_equal 1
    as.first.special_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]
  end

  it "should respect one_through_one association's :left_primary_key and :right_primary_key options" do
    EagerAlbum.one_through_one :special_genre, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_primary_key=>:xxx, :right_key=>:genre_id, :join_table=>:ag
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}])
    as = EagerAlbum.eager(:special_genre).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.xxx) WHERE (ag.album_id IN (2))"]
    as.length.must_equal 1
    as.first.special_genre.must_equal EagerGenre.load(:id=>5)
  end

  it "should respect the :limit option on a one_to_many association using the :ruby strategy" do
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>2, :eager_limit_strategy=>:ruby
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:album_id=>1, :id=>2}, {:album_id=>1, :id=>3}, {:album_id=>1, :id=>4}])
    as = EagerAlbum.eager(:first_two_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE (tracks.album_id IN (1))"]
    as.length.must_equal 1
    as.first.first_two_tracks.must_equal [EagerTrack.load(:album_id=>1, :id=>2), EagerTrack.load(:album_id=>1, :id=>3)]

    DB.reset
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>[1,1], :eager_limit_strategy=>:ruby
    as = EagerAlbum.eager(:first_two_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE (tracks.album_id IN (1))"]
    as.length.must_equal 1
    as.first.first_two_tracks.must_equal [EagerTrack.load(:album_id=>1, :id=>3)]

    DB.reset
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>[nil,1], :eager_limit_strategy=>:ruby
    as = EagerAlbum.eager(:first_two_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM tracks WHERE (tracks.album_id IN (1))"]
    as.length.must_equal 1
    as.first.first_two_tracks.must_equal [EagerTrack.load(:album_id=>1, :id=>3), EagerTrack.load(:album_id=>1, :id=>4)]
  end

  it "should respect the :limit option on a one_to_many association" do
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>2
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY name LIMIT 2) AS t1']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>[2, 1]
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY name LIMIT 2 OFFSET 1) AS t1']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>[nil, 1]
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE (1 = tracks.album_id) ORDER BY name OFFSET 1) AS t1']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end

  it "should respect the :limit option on a one_to_many association with an association block" do
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>2 do |ds| ds.where(:a=>1) end
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT * FROM tracks WHERE ((a = 1) AND (1 = tracks.album_id)) ORDER BY name LIMIT 2) AS t1']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end
  
  it "should respect the :limit option on a one_to_many association using the :window_function strategy" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>2, :eager_limit_strategy=>:window_function
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x <= 2)']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>[2, 1], :eager_limit_strategy=>:window_function
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE ((x_sequel_row_number_x >= 2) AND (x_sequel_row_number_x < 4))']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>[nil, 1], :eager_limit_strategy=>:window_function
    a = EagerAlbum.eager(:tracks).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x >= 2)']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end
  
  it "should use a ruby strategy for limit if :eager_graph option is used" do
    EagerTrack.many_to_one :album2, :clone=>:album
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>2, :eager_graph=>:album2
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:album_id=>1, :id=>2, :album2_id=>1, :band_id=>5}, {:album_id=>1, :id=>3, :album2_id=>1, :band_id=>5}, {:album_id=>1, :id=>4, :album2_id=>1, :band_id=>5}])
    EagerTrack.dataset.columns(:id, :album_id)
    as = EagerAlbum.eager(:first_two_tracks).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT tracks.id, tracks.album_id, album2.id AS album2_id, album2.band_id FROM tracks LEFT OUTER JOIN albums AS album2 ON (album2.id = tracks.album_id) WHERE (tracks.album_id IN (1))"]
    as.length.must_equal 1
    tracks = as.first.first_two_tracks
    tracks.must_equal [EagerTrack.load(:album_id=>1, :id=>2), EagerTrack.load(:album_id=>1, :id=>3)]
    tracks.first.album2.must_equal EagerAlbum.load(:id=>1, :band_id=>5)
    tracks.last.album2.must_equal EagerAlbum.load(:id=>1, :band_id=>5)
  end
  
  it "should not use a union strategy for limit by default if providing a per-eager load callback" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_to_many :tracks, :class=>'EagerTrack', :key=>:album_id, :order=>:name, :limit=>2
    a = EagerAlbum.eager(:tracks=>proc{|ds| ds.where(:id=>3)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks WHERE ((tracks.album_id IN (1)) AND (id = 3))) AS t1 WHERE (x_sequel_row_number_x <= 2)']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end

  it "should respect the limit option on a many_to_many association using the :ruby strategy" do
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>2, :eager_limit_strategy=>:ruby
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}, {:x_foreign_key_x=>2, :id=>7}])
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]
    
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}, {:x_foreign_key_x=>2, :id=>7}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[1, 1], :eager_limit_strategy=>:ruby
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>6)]
    
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}, {:x_foreign_key_x=>2, :id=>7}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[nil, 1], :eager_limit_strategy=>:ruby
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>6), EagerGenre.load(:id=>7)]
  end

  it "should respect the limit option on a many_to_many association" do
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}]).with_extend{def supports_window_functions?; true end}
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>2, :order=>:name
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (2 = ag.album_id) ORDER BY name LIMIT 2) AS t1"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]

    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[1, 1], :order=>:name
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (2 = ag.album_id) ORDER BY name LIMIT 1 OFFSET 1) AS t1"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5)]

    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[nil, 1], :order=>:name
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (2 = ag.album_id) ORDER BY name OFFSET 1) AS t1"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]
  end

  it "should respect the limit option on a many_to_many association using the :window_function strategy" do
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}]).with_extend{def supports_window_functions?; true end}
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>2, :order=>:name, :eager_limit_strategy=>:window_function
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id ORDER BY name) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))) AS t1 WHERE (x_sequel_row_number_x <= 2)"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]

    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[1, 1], :order=>:name, :eager_limit_strategy=>:window_function
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id ORDER BY name) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))) AS t1 WHERE ((x_sequel_row_number_x >= 2) AND (x_sequel_row_number_x < 3))"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5)]

    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>2, :id=>5}, {:x_foreign_key_x=>2, :id=>6}])
    EagerAlbum.many_to_many :first_two_genres, :class=>:EagerGenre, :left_primary_key=>:band_id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[nil, 1], :order=>:name, :eager_limit_strategy=>:window_function
    as = EagerAlbum.eager(:first_two_genres).all
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT * FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id ORDER BY name) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (2))) AS t1 WHERE (x_sequel_row_number_x >= 2)"]
    as.length.must_equal 1
    as.first.first_two_genres.must_equal [EagerGenre.load(:id=>5), EagerGenre.load(:id=>6)]
  end

  it "should use the :eager_loader association option when eager loading" do
    EagerAlbum.many_to_one :special_band, :key=>:band_id, :eager_loader=>(proc do |eo| 
      item = EagerBand.filter(:album_id=>eo[:rows].collect{|r| [r.pk, r.pk*2]}.flatten).order(:name).first
      eo[:rows].each{|r| r.associations[:special_band] = item}
    end)
    EagerAlbum.one_to_many :special_tracks, :eager_loader=>(proc do |eo|
      items = EagerTrack.filter(:album_id=>eo[:rows].collect{|r| [r.pk, r.pk*2]}.flatten).all
      eo[:rows].each{|r| r.associations[:special_tracks] = items}
    end)
    EagerAlbum.many_to_many :special_genres, :class=>:EagerGenre, :eager_loader=>(proc do |eo| 
      items = EagerGenre.inner_join(:ag, [:genre_id]).filter(:album_id=>eo[:rows].collect{|r| r.pk}).all
      eo[:rows].each{|r| r.associations[:special_genres] = items}
    end)
    a = EagerAlbum.eager(:special_genres, :special_tracks, :special_band).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    sqls = DB.sqls
    sqls.shift.must_equal 'SELECT * FROM albums'
    sqls.sort.must_equal ['SELECT * FROM bands WHERE (album_id IN (1, 2)) ORDER BY name LIMIT 1',
      'SELECT * FROM genres INNER JOIN ag USING (genre_id) WHERE (album_id IN (1))',
      'SELECT * FROM tracks WHERE (album_id IN (1, 2))']
    a = a.first
    a.special_band.must_equal EagerBand.load(:id => 2)
    a.special_tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    a.special_genres.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal []
  end

  it "should respect :after_load callbacks on associations when eager loading" do
    EagerAlbum.many_to_one :al_band, :class=>'EagerBand', :key=>:band_id, :after_load=>proc{|o, a| a.id *=2}
    EagerAlbum.one_to_many :al_tracks, :class=>'EagerTrack', :key=>:album_id, :after_load=>proc{|o, os| os.each{|a| a.id *=2}}
    EagerAlbum.many_to_many :al_genres, :class=>'EagerGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :after_load=>proc{|o, os| os.each{|a| a.id *=2}}
    a = EagerAlbum.eager(:al_band, :al_tracks, :al_genres).all.first
    a.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.al_band.must_equal EagerBand.load(:id=>4)
    a.al_tracks.must_equal [EagerTrack.load(:id=>6, :album_id=>1)]
    a.al_genres.must_equal [EagerGenre.load(:id=>8)]
  end
  
  it "should respect :uniq option when eagerly loading many_to_many associations" do
    EagerAlbum.many_to_many :al_genres, :class=>'EagerGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :uniq=>true
    EagerGenre.dataset = EagerGenre.dataset.with_fetch([{:x_foreign_key_x=>1, :id=>8}, {:x_foreign_key_x=>1, :id=>8}])
    a = EagerAlbum.eager(:al_genres).all.first
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.al_genres.must_equal [EagerGenre.load(:id=>8)]
  end
  
  it "should respect :distinct option when eagerly loading many_to_many associations" do
    EagerAlbum.many_to_many :al_genres, :class=>'EagerGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :distinct=>true
    a = EagerAlbum.eager(:al_genres).all.first
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT DISTINCT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.al_genres.must_equal [EagerGenre.load(:id=>4)]
  end

  it "should eagerly load a many_to_one association with custom eager block" do
    a = EagerAlbum.eager(:band => proc {|ds| ds.select(:id, :name)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT id, name FROM bands WHERE (bands.id IN (2))']
    a.first.band.must_equal EagerBand.load(:id => 2)
    DB.sqls.must_equal []
  end

  it "should eagerly load a one_to_one association with custom eager block" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id
    a = EagerAlbum.eager(:track => proc {|ds| ds.select(:id)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT id FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.track.must_equal EagerTrack.load(:id => 3, :album_id=>1)
    DB.sqls.must_equal []
  end

  it "should eagerly load a one_to_many association with custom eager block" do
    a = EagerAlbum.eager(:tracks => proc {|ds| ds.select(:id)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT id FROM tracks WHERE (tracks.album_id IN (1))']
    a.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end

  it "should eagerly load a many_to_many association with custom eager block" do
    a = EagerAlbum.eager(:genres => proc {|ds| ds.select(:name)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT name, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genres.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal []
  end

  it "should eagerly load a one_through_one association with custom eager block" do
    a = EagerAlbum.eager(:genre => proc {|ds| ds.select(:name)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    DB.sqls.must_equal ['SELECT * FROM albums', "SELECT name, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a.first.genre.must_equal EagerGenre.load(:id => 4)
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading within a custom eager block" do
    a = EagerTrack.eager(:album => proc {|ds| ds.eager(:band => :members)}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ['SELECT * FROM tracks',
      'SELECT * FROM albums WHERE (albums.id IN (1))',
      'SELECT * FROM bands WHERE (bands.id IN (2))',
      "SELECT members.*, bm.band_id AS x_foreign_key_x FROM members INNER JOIN bm ON (bm.member_id = members.id) WHERE (bm.band_id IN (2))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.band.members.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading with custom callback with hash value" do
    a = EagerTrack.eager(:album=>{proc{|ds| ds.select(:id, :band_id)}=>{:band => :members}}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ['SELECT * FROM tracks',
      'SELECT id, band_id FROM albums WHERE (albums.id IN (1))',
      'SELECT * FROM bands WHERE (bands.id IN (2))',
      "SELECT members.*, bm.band_id AS x_foreign_key_x FROM members INNER JOIN bm ON (bm.member_id = members.id) WHERE (bm.band_id IN (2))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.band.members.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading with custom callback with symbol value" do
    a = EagerTrack.eager(:album=>{proc{|ds| ds.select(:id, :band_id)}=>:band}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ['SELECT * FROM tracks',
      'SELECT id, band_id FROM albums WHERE (albums.id IN (1))',
      'SELECT * FROM bands WHERE (bands.id IN (2))']
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading with custom callback with symbol value when association has a limit" do
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch((1..11).map{|i| {:band_id=>2, :id=>i}})
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:id=>3, :album_id=>1}])
    a = EagerBand.eager(:top_10_albums=>{proc{|ds| ds.select(:id, :name)}=>:tracks}).all
    a.must_equal [EagerBand.load(:id => 2)]
    DB.sqls.must_equal ['SELECT * FROM bands',
      'SELECT id, name FROM albums WHERE (albums.band_id IN (2))',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11))']
    a = a.first
    a.top_10_albums.must_equal((1..10).map{|i| EagerAlbum.load(:band_id=>2, :id=>i)})
    a.top_10_albums.map{|x| x.tracks}.must_equal [[EagerTrack.load(:id => 3, :album_id=>1)]] + ([[]] * 9)
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading with custom callback with symbol value when association has a limit when using window function eager limit strategy" do
    EagerAlbum.dataset = EagerAlbum.dataset.with_fetch(:band_id=>2, :id=>1).with_extend{def supports_window_functions?; true end}
    EagerTrack.dataset = EagerTrack.dataset.with_fetch([{:id=>3, :album_id=>1}])
    a = EagerBand.eager(:top_10_albums=>{proc{|ds| ds.select(:id, :name)}=>:tracks}).all
    a.must_equal [EagerBand.load(:id => 2)]
    DB.sqls.must_equal ['SELECT * FROM bands',
      'SELECT * FROM (SELECT id, name, row_number() OVER (PARTITION BY albums.band_id) AS x_sequel_row_number_x FROM albums WHERE (albums.band_id IN (2))) AS t1 WHERE (x_sequel_row_number_x <= 10)',
      'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a = a.first
    a.top_10_albums.must_equal [EagerAlbum.load(:band_id=>2, :id=>1)]
    a.top_10_albums.first.tracks.must_equal [EagerTrack.load(:id => 3, :album_id=>1)]
    DB.sqls.must_equal []
  end

  it "should allow cascading of eager loading with custom callback with array value" do
    a = EagerTrack.eager(:album=>{proc{|ds| ds.select(:id, :band_id)}=>[:band, :band_name]}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    sqls = DB.sqls
    sqls.slice!(0..1).must_equal ['SELECT * FROM tracks',
      'SELECT id, band_id FROM albums WHERE (albums.id IN (1))']
    sqls.sort.must_equal ['SELECT * FROM bands WHERE (bands.id IN (2))',
      'SELECT id, name FROM bands WHERE (bands.id IN (2))']
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.band_name.must_equal EagerBand.load(:id => 2)
    DB.sqls.must_equal []
  end

  it "should call both association and custom eager blocks" do
    EagerBand.eager(:good_albums => proc {|ds| ds.select(:name)}).all
    DB.sqls.must_equal ['SELECT * FROM bands', "SELECT name FROM albums WHERE ((name = 'good') AND (albums.band_id IN (2)))"]
  end

  it "should respect an :eager_limit option passed in a custom callback" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    a = EagerAlbum.eager(:tracks=> proc{|ds| ds.clone(:eager_limit=>5)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id=> 2)]
    sqls = DB.sqls
    sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x <= 5)']
    a = a.first
    a.tracks.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal []
  end

  it "should respect an :eager_limit option that includes an offset" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.eager(:tracks=> proc{|ds| ds.clone(:eager_limit=>[5, 5])}).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE ((x_sequel_row_number_x >= 6) AND (x_sequel_row_number_x < 11))']
  end

  it "should have an :eager_limit option passed in a custom callback override a :limit defined in the association" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>2
    EagerAlbum.eager(:first_two_tracks=> proc{|ds| ds.clone(:eager_limit=>5)}).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x <= 5)']
  end

  it "should respect an :eager_limit_strategy option passed in a custom callback" do
    EagerTrack.dataset = EagerTrack.dataset.with_fetch((1..4).map{|i| {:album_id=>1, :id=>i}}).with_extend{def supports_window_functions?; true end}
    a = EagerAlbum.eager(:tracks=> proc{|ds| ds.clone(:eager_limit=>2, :eager_limit_strategy=>:ruby)}).all
    a.must_equal [EagerAlbum.load(:id => 1, :band_id=> 2)]
    sqls = DB.sqls
    sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1))']
    a = a.first
    a.tracks.must_equal [EagerTrack.load(:id => 1, :album_id => 1), EagerTrack.load(:id => 2, :album_id => 1)]
    DB.sqls.must_equal []
  end

  it "should have an :eager_limit_strategy option passed in a custom callback override a :eager_limit_strategy defined in the association" do
    EagerTrack.dataset = EagerTrack.dataset.with_extend{def supports_window_functions?; true end}
    EagerAlbum.one_to_many :first_two_tracks, :class=>:EagerTrack, :key=>:album_id, :limit=>2, :eager_limit_strategy=>:ruby
    EagerAlbum.eager(:first_two_tracks=> proc{|ds| ds.clone(:eager_limit_strategy=>:window_function)}).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks WHERE (tracks.album_id IN (1))) AS t1 WHERE (x_sequel_row_number_x <= 2)']
  end

  it "should raise error if using :eager_limit for a singular association" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id
    proc{EagerAlbum.eager(:track=> proc{|ds| ds.clone(:eager_limit=>1)}).all}.must_raise Sequel::Error
    DB.sqls.must_equal ['SELECT * FROM albums']
  end

  it "should raise error if using :eager_limit for a singular association" do
    EagerAlbum.one_to_one :track, :class=>'EagerTrack', :key=>:album_id, :order=>:name
    a = EagerAlbum.eager(:track=> proc{|ds| ds.order(:foo)}).all
    DB.sqls.must_equal ['SELECT * FROM albums', 'SELECT * FROM tracks WHERE (tracks.album_id IN (1)) ORDER BY foo']
    a = a.first
    a.track.must_equal EagerTrack.load(:id => 3, :album_id => 1)
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_one with eager_graph of many_to_one in custom callback" do
    a = EagerTrack.eager(:album=>proc{|ds| ds.eager_graph(:band).with_fetch(:id=>1, :band_id=>2, :band_id_0=>2)}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ["SELECT * FROM tracks",
      "SELECT albums.id, albums.band_id, band.id AS band_id_0 FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) WHERE (albums.id IN (1))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_one with eager_graph of one_to_many in custom callback" do
    a = EagerTrack.eager(:album=>proc{|ds| ds.eager_graph(:tracks).with_fetch(:id=>1, :band_id=>2, :tracks_id=>3)}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ["SELECT * FROM tracks",
      "SELECT albums.id, albums.band_id, tracks.id AS tracks_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) WHERE (albums.id IN (1))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.tracks.must_equal [EagerTrack.load(:id=>3)]
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_one with eager_graph of many_to_many in custom callback" do
    a = EagerTrack.eager(:album=>proc{|ds| ds.eager_graph(:genres).with_fetch(:id=>1, :band_id=>2, :genres_id=>4)}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ["SELECT * FROM tracks",
      "SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id) WHERE (albums.id IN (1))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.genres.must_equal [EagerGenre.load(:id=>4)]
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_many with eager_graph of many_to_one in custom callback" do
    a = EagerGenre.eager(:albums=>proc{|ds| ds.columns(:id, :band_id, :x_foreign_key_x).eager_graph(:band).with_fetch(:id=>1, :band_id=>2, :x_foreign_key_x=>4, :band_id_0=>2)}).all
    a.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal ["SELECT * FROM genres",
      "SELECT albums.id, albums.band_id, albums.x_foreign_key_x, band.id AS band_id_0 FROM (SELECT albums.*, ag.genre_id AS x_foreign_key_x FROM albums INNER JOIN ag ON (ag.album_id = albums.id) WHERE (ag.genre_id IN (4))) AS albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)"]
    a = a.first
    a.albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.albums.first.band.must_equal EagerBand.load(:id=>2)
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_many with eager_graph of one_to_many in custom callback" do
    a = EagerGenre.eager(:albums=>proc{|ds| ds.columns(:id, :band_id, :x_foreign_key_x).eager_graph(:tracks).with_fetch(:id=>1, :band_id=>2, :x_foreign_key_x=>4, :tracks_id=>5)}).all
    a.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal ["SELECT * FROM genres",
      "SELECT albums.id, albums.band_id, albums.x_foreign_key_x, tracks.id AS tracks_id FROM (SELECT albums.*, ag.genre_id AS x_foreign_key_x FROM albums INNER JOIN ag ON (ag.album_id = albums.id) WHERE (ag.genre_id IN (4))) AS albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)"]
    a = a.first
    a.albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.albums.first.tracks.must_equal [EagerTrack.load(:id=>5)]
    DB.sqls.must_equal []
  end

  it "should support eager load of many_to_many with eager_graph of many_to_many in custom callback" do
    a = EagerGenre.eager(:albums=>proc{|ds| ds.columns(:id, :band_id, :x_foreign_key_x).eager_graph(:genres).with_fetch(:id=>1, :band_id=>2, :x_foreign_key_x=>4, :genres_id=>4)}).all
    a.must_equal [EagerGenre.load(:id => 4)]
    DB.sqls.must_equal ["SELECT * FROM genres",
      "SELECT albums.id, albums.band_id, albums.x_foreign_key_x, genres.id AS genres_id FROM (SELECT albums.*, ag.genre_id AS x_foreign_key_x FROM albums INNER JOIN ag ON (ag.album_id = albums.id) WHERE (ag.genre_id IN (4))) AS albums LEFT OUTER JOIN ag AS ag_0 ON (ag_0.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag_0.genre_id)"]
    a = a.first
    a.albums.must_equal [EagerAlbum.load(:id => 1, :band_id => 2)]
    a.albums.first.genres.must_equal [EagerGenre.load(:id=>4)]
    DB.sqls.must_equal []
  end

  it "should support eager_graph usage with cascaded associations in custom callback" do
    a = EagerTrack.eager(:album=>proc{|ds| ds.eager_graph(:band=>:members).with_fetch(:id=>1, :band_id=>2, :band_id_0=>2, :members_id=>5)}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ["SELECT * FROM tracks",
      "SELECT albums.id, albums.band_id, band.id AS band_id_0, members.id AS members_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) LEFT OUTER JOIN bm ON (bm.band_id = band.id) LEFT OUTER JOIN members ON (members.id = bm.member_id) WHERE (albums.id IN (1))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.band.members.must_equal [EagerBandMember.load(:id => 5)]
    DB.sqls.must_equal []
  end

  it "should support eager_graph usage in custom callback with dependencies" do
    a = EagerTrack.eager(:album=>{proc{|ds| ds.eager_graph(:band).with_fetch(:id=>1, :band_id=>2, :band_id_0=>2)}=>:genre}).all
    a.must_equal [EagerTrack.load(:id => 3, :album_id => 1)]
    DB.sqls.must_equal ["SELECT * FROM tracks",
      "SELECT albums.id, albums.band_id, band.id AS band_id_0 FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) WHERE (albums.id IN (1))",
      "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
    a = a.first
    a.album.must_equal EagerAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal EagerBand.load(:id => 2)
    a.album.genre.must_equal EagerGenre.load(:id => 4)
    DB.sqls.must_equal []
  end
end

describe Sequel::Model, "#eager_graph" do
  before(:all) do
    class ::GraphAlbum < Sequel::Model(:albums)
      columns :id, :band_id
      many_to_one :band, :class=>'GraphBand', :key=>:band_id
      one_to_many :tracks, :class=>'GraphTrack', :key=>:album_id
      one_to_one :track, :class=>'GraphTrack', :key=>:album_id
      many_to_many :genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag
      one_through_one :genre, :clone=>:genres
      many_to_one :previous_album, :class=>'GraphAlbum'
    end

    class ::GraphBand < Sequel::Model(:bands)
      columns :id, :vocalist_id
      many_to_one :vocalist, :class=>'GraphBandMember', :key=>:vocalist_id
      one_to_many :albums, :class=>'GraphAlbum', :key=>:band_id
      many_to_many :members, :class=>'GraphBandMember', :left_key=>:band_id, :right_key=>:member_id, :join_table=>:bm
      many_to_many :genres, :class=>'GraphGenre', :left_key=>:band_id, :right_key=>:genre_id, :join_table=>:bg
    end
    
    class ::GraphTrack < Sequel::Model(:tracks)
      columns :id, :album_id
      many_to_one :album, :class=>'GraphAlbum', :key=>:album_id
    end
    
    class ::GraphGenre < Sequel::Model(:genres)
      columns :id
      many_to_many :albums, :class=>'GraphAlbum', :left_key=>:genre_id, :right_key=>:album_id, :join_table=>:ag
    end
    
    class ::GraphBandMember < Sequel::Model(:members)
      columns :id
      many_to_many :bands, :class=>'GraphBand', :left_key=>:member_id, :right_key=>:band_id, :join_table=>:bm
    end
  end
  before do
    DB.sqls
  end
  after(:all) do
    [:GraphAlbum, :GraphBand, :GraphTrack, :GraphGenre, :GraphBandMember].each{|x| Object.send(:remove_const, x)}
  end
    
  it "should raise an error if called without a symbol or hash" do
    proc{GraphAlbum.eager_graph(Object.new)}.must_raise(Sequel::Error)
  end

  it "should work correctly with select_map" do
    ds = GraphAlbum.eager_graph(:band)
    ds.with_fetch([{:id=>1}, {:id=>2}]).select_map(Sequel[:albums][:id]).must_equal [1, 2]
    DB.sqls.must_equal ['SELECT albums.id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)']
    ds.with_fetch([{:id=>1}, {:id=>2}]).select_map([Sequel[:albums][:id], Sequel[:albums][:id]]).must_equal [[1, 1], [2, 2]]
    DB.sqls.must_equal ['SELECT albums.id, albums.id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)']
  end

  it "should work correctly with single_value" do
    ds = GraphAlbum.eager_graph(:band).select(Sequel[:albums][:id])
    ds.with_fetch([{:id=>1}]).single_value.must_equal 1
    DB.sqls.must_equal ['SELECT albums.id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) LIMIT 1']
  end

  it "should not split results and assign associations if ungraphed is called" do
    ds = GraphAlbum.eager_graph(:band).ungraphed
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    ds.with_fetch(:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>3).all.must_equal [GraphAlbum.load(:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>3)]
  end

  it "should not modify existing dataset" do
    ds1 = GraphAlbum.dataset
    ds2 = ds1.eager_graph(:band)
    ds1.eager_graph(:band)
    ds2.eager_graph(:tracks)
    ds2.eager_graph(:tracks)
  end

  it "should allow manually selecting the alias base per call via an AliasedExpression" do
    ds = GraphAlbum.eager_graph(Sequel.as(:band, :b))
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, b.id AS b_id, b.vocalist_id FROM albums LEFT OUTER JOIN bands AS b ON (b.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :b_id=>2, :vocalist_id=>3).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>3)
  end
  
  it "should handle multiple associations using the same alias base" do
    ds = GraphAlbum.eager_graph(Sequel.as(:genres, :b), Sequel.as(:tracks, :b), Sequel.as(:band, :b))
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, b.id AS b_id, b_0.id AS b_0_id, b_0.album_id, b_1.id AS b_1_id, b_1.vocalist_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS b ON (b.id = ag.genre_id) LEFT OUTER JOIN tracks AS b_0 ON (b_0.album_id = albums.id) LEFT OUTER JOIN bands AS b_1 ON (b_1.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :b_id=>4, :b_0_id=>3, :album_id=>1, :b_1_id=>2, :vocalist_id=>6).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.tracks.must_equal [GraphTrack.load({:id => 3, :album_id=>1})]
    a.genres.must_equal [GraphGenre.load(:id => 4)]

    ds = GraphTrack.eager_graph(Sequel.as(:album, :b)=>{Sequel.as(:band, :b)=>Sequel.as(:members, :b)})
    ds.sql.must_equal 'SELECT tracks.id, tracks.album_id, b.id AS b_id, b.band_id, b_0.id AS b_0_id, b_0.vocalist_id, b_1.id AS b_1_id FROM tracks LEFT OUTER JOIN albums AS b ON (b.id = tracks.album_id) LEFT OUTER JOIN bands AS b_0 ON (b_0.id = b.band_id) LEFT OUTER JOIN bm ON (bm.band_id = b_0.id) LEFT OUTER JOIN members AS b_1 ON (b_1.id = bm.member_id)'
    a = ds.with_fetch(:id=>3, :album_id=>1, :b_id=>1, :band_id=>2, :b_1_id=>5, :b_0_id=>2, :vocalist_id=>6).all
    a.must_equal [GraphTrack.load(:id => 3, :album_id => 1)]
    a = a.first
    a.album.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.album.band.members.must_equal [GraphBandMember.load(:id => 5)]
  end
  
  it "should set up correct inner joins when using association_join" do
    GraphAlbum.association_join(:band).sql.must_equal 'SELECT * FROM albums INNER JOIN bands AS band ON (band.id = albums.band_id)'
    GraphAlbum.association_join(:track).sql.must_equal 'SELECT * FROM albums INNER JOIN tracks AS track ON (track.album_id = albums.id)'
    GraphAlbum.association_join(:tracks).sql.must_equal 'SELECT * FROM albums INNER JOIN tracks ON (tracks.album_id = albums.id)'
    GraphAlbum.association_join(:genres).sql.must_equal 'SELECT * FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres ON (genres.id = ag.genre_id)'
    GraphAlbum.association_join(:genre).sql.must_equal 'SELECT * FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres AS genre ON (genre.id = ag.genre_id)'
  end
  
  it "should handle custom selects when using association_join" do
    GraphAlbum.select{a(b)}.association_join(:band).sql.must_equal 'SELECT a(b) FROM albums INNER JOIN bands AS band ON (band.id = albums.band_id)'
    GraphAlbum.select{a(b)}.association_join(:track).sql.must_equal 'SELECT a(b) FROM albums INNER JOIN tracks AS track ON (track.album_id = albums.id)'
    GraphAlbum.select{a(b)}.association_join(:tracks).sql.must_equal 'SELECT a(b) FROM albums INNER JOIN tracks ON (tracks.album_id = albums.id)'
    GraphAlbum.select{a(b)}.association_join(:genres).sql.must_equal 'SELECT a(b) FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres ON (genres.id = ag.genre_id)'
    GraphAlbum.select{a(b)}.association_join(:genre).sql.must_equal 'SELECT a(b) FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres AS genre ON (genre.id = ag.genre_id)'
  end
  
  it "should set up correct join types when using association_*_join" do
    GraphAlbum.association_inner_join(:band).sql.must_equal 'SELECT * FROM albums INNER JOIN bands AS band ON (band.id = albums.band_id)'
    GraphAlbum.association_left_join(:track).sql.must_equal 'SELECT * FROM albums LEFT JOIN tracks AS track ON (track.album_id = albums.id)'
    GraphAlbum.association_right_join(:tracks).sql.must_equal 'SELECT * FROM albums RIGHT JOIN tracks ON (tracks.album_id = albums.id)'
    GraphAlbum.association_full_join(:genres).sql.must_equal 'SELECT * FROM albums FULL JOIN ag ON (ag.album_id = albums.id) FULL JOIN genres ON (genres.id = ag.genre_id)'
  end
  
  it "should eagerly load a single many_to_one association" do
    ds = GraphAlbum.eager_graph(:band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>3).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>3)
  end
  
  it "should eagerly load a single many_to_one association with the same name as a column" do
    GraphAlbum.def_column_alias(:band_id_id, :band_id)
    GraphAlbum.many_to_one :band_id, :key_column=>:band_id, :class=>GraphBand
    ds = GraphAlbum.eager_graph(:band_id)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band_id.id AS band_id_id, band_id.vocalist_id FROM albums LEFT OUTER JOIN bands AS band_id ON (band_id.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :band_id_id=>2, :vocalist_id=>3).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.band_id.must_equal GraphBand.load(:id => 2, :vocalist_id=>3)
  end
  
  it "should support :join_type eager_graph option one_to_one association" do
    ds = GraphAlbum.eager_graph_with_options(:track, :join_type=>:inner)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, track.id AS track_id, track.album_id FROM albums INNER JOIN tracks AS track ON (track.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :track_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.track.must_equal GraphTrack.load(:id => 3, :album_id=>1)
  end

  it "should eagerly load a single one_to_one association" do
    ds = GraphAlbum.eager_graph(:track)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, track.id AS track_id, track.album_id FROM albums LEFT OUTER JOIN tracks AS track ON (track.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :track_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.track.must_equal GraphTrack.load(:id => 3, :album_id=>1)
  end

  it "should eagerly graph a single one_to_one association using the :distinct_on strategy" do
    sub = Class.new(GraphTrack)
    sub.dataset = sub.dataset.with_extend do
      def supports_distinct_on?; true end
      def columns; [:id, :album_id] end
    end
    GraphAlbum.one_to_one :ltrack, :clone=>:track, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:ltrack, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, ltrack.id AS ltrack_id, ltrack.album_id FROM albums LEFT OUTER JOIN (SELECT DISTINCT ON (tracks.album_id) * FROM tracks ORDER BY tracks.album_id) AS ltrack ON (ltrack.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :ltrack_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.ltrack.must_equal sub.load(:id => 3, :album_id=>1)
  end
  
  it "should eagerly graph a single one_to_one association using the :window_function strategy" do
    sub = Class.new(GraphTrack)
    sub.dataset = sub.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; [:id, :album_id] end
    end
    GraphAlbum.one_to_one :ltrack, :clone=>:track, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:ltrack, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, ltrack.id AS ltrack_id, ltrack.album_id FROM albums LEFT OUTER JOIN (SELECT id, album_id FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1)) AS ltrack ON (ltrack.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :ltrack_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.ltrack.must_equal sub.load(:id => 3, :album_id=>1)
  end
  
  it "should eagerly graph a single one_to_one association using the :correlated_subquery strategy" do
    sub = Class.new(GraphTrack)
    sub.dataset = sub.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; [:id, :album_id] end
    end
    GraphAlbum.one_to_one :ltrack, :clone=>:track, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:ltrack, :limit_strategy=>:correlated_subquery)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, ltrack.id AS ltrack_id, ltrack.album_id FROM albums LEFT OUTER JOIN (SELECT * FROM tracks WHERE (tracks.id IN (SELECT t1.id FROM tracks AS t1 WHERE (t1.album_id = tracks.album_id) LIMIT 1))) AS ltrack ON (ltrack.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :ltrack_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.ltrack.must_equal sub.load(:id => 3, :album_id=>1)
  end
  
  it "should eagerly load a single one_to_many association" do
    ds = GraphAlbum.eager_graph(:tracks)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :tracks_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.tracks.must_equal [GraphTrack.load(:id => 3, :album_id=>1)]
  end

  it "should eagerly graph a single one_to_many association using the :window_function strategy" do
    sub = Class.new(GraphTrack)
    sub.dataset = sub.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; [:id, :album_id] end
    end
    GraphAlbum.one_to_many :ltracks, :clone=>:tracks, :limit=>2, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:ltracks, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, ltracks.id AS ltracks_id, ltracks.album_id FROM albums LEFT OUTER JOIN (SELECT id, album_id FROM (SELECT *, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x <= 2)) AS ltracks ON (ltracks.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :ltracks_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.ltracks.must_equal [sub.load(:id => 3, :album_id=>1)]
  end
  
  it "should eagerly load a single many_to_many association" do
    ds = GraphAlbum.eager_graph(:genres)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genres.must_equal [GraphGenre.load(:id => 4)]
  end

  it "should eagerly graph a single many_to_many association using the :window_function strategy" do
    sub = Class.new(GraphGenre)
    sub.dataset = sub.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; literal(opts[:select]) =~ /x_foreign_key_x/ ? [:id, :x_foreign_key_x] : [:id] end
    end
    GraphAlbum.many_to_many :lgenres, :clone=>:genres, :class=>sub, :limit=>2
    ds = GraphAlbum.eager_graph_with_options(:lgenres, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, lgenres.id AS lgenres_id FROM albums LEFT OUTER JOIN (SELECT id, x_foreign_key_x FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id)) AS t1 WHERE (x_sequel_row_number_x <= 2)) AS lgenres ON (lgenres.x_foreign_key_x = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :lgenres_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.lgenres.must_equal [sub.load(:id => 4)]
  end
  
  it "should eagerly load a single one_through_one association" do
    ds = GraphAlbum.eager_graph(:genre)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genre.id AS genre_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genre ON (genre.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genre_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genre.must_equal GraphGenre.load(:id => 4)
  end

  it "should eagerly graph a single one_through_one association using the :distinct_on strategy" do
    sub = Class.new(GraphGenre)
    sub.dataset = sub.dataset.with_extend do
      def supports_distinct_on?; true end
      def columns; [:id] end
    end
    GraphAlbum.one_through_one :lgenre, :clone=>:genre, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:lgenre, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, lgenre.id AS lgenre_id FROM albums LEFT OUTER JOIN (SELECT DISTINCT ON (ag.album_id) genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) ORDER BY ag.album_id) AS lgenre ON (lgenre.x_foreign_key_x = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :lgenre_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.lgenre.must_equal sub.load(:id => 4)
  end
  
  it "should eagerly graph a single one_through_one association using the :window_function strategy" do
    sub = Class.new(GraphGenre)
    sub.dataset = sub.dataset.with_extend do
      def supports_window_functions?; true end
      def columns; literal(opts[:select]) =~ /x_foreign_key_x/ ? [:id, :x_foreign_key_x] : [:id] end
    end
    GraphAlbum.one_through_one :lgenre, :clone=>:genre, :class=>sub
    ds = GraphAlbum.eager_graph_with_options(:lgenre, :limit_strategy=>true)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, lgenre.id AS lgenre_id FROM albums LEFT OUTER JOIN (SELECT id, x_foreign_key_x FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id)) AS t1 WHERE (x_sequel_row_number_x = 1)) AS lgenre ON (lgenre.x_foreign_key_x = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :lgenre_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.lgenre.must_equal sub.load(:id => 4)
  end
  
  it "should correctly handle an aliased join table in many_to_many and one_through_one with graph_conditions or graph_block" do
    c = Class.new(GraphAlbum)
    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:ga), :graph_conditions=>{:a=>:b}
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON ((genres.id = ga.genre_id) AND (genres.a = ga.b))'
    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:ga), :graph_block => proc{true}
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON ((genres.id = ga.genre_id) AND (genres.a = ga.b) AND \'t\')'
  end

  with_symbol_splitting "should correctly handle an aliased join table symbol in many_to_many and one_through_one with graph_conditions or graph_block" do
    c = Class.new(GraphAlbum)
    c.many_to_many :genres, :clone=>:genres, :join_table=>:ag___ga, :graph_conditions=>{:a=>:b}
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON ((genres.id = ga.genre_id) AND (genres.a = ga.b))'
    c.many_to_many :genres, :clone=>:genres, :join_table=>:ag___ga, :graph_block => proc{true}
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON ((genres.id = ga.genre_id) AND (genres.a = ga.b) AND \'t\')'
  end

  it "should raise Error when using eager_graph with :conditions option that isn't a conditions specifier" do
    c = Class.new(GraphAlbum)
    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:ga), :conditions=>'true'
    proc{c.eager_graph(:genres)}.must_raise Sequel::Error
  end

  with_symbol_splitting "should correctly handle an aliased join table symbol in many_to_many and one_through_one" do
    c = Class.new(GraphAlbum)
    c.many_to_many :genres, :clone=>:genres, :join_table=>:ag___ga
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ga.genre_id)'

    c.many_to_many :genre, :clone=>:genre, :join_table=>:ag___ga
    c.eager_graph(:genre).sql.must_equal 'SELECT albums.id, albums.band_id, genre.id AS genre_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres AS genre ON (genre.id = ga.genre_id)'

    c.many_to_many :genres, :clone=>:genres, :join_table=>:ag___albums
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS albums_0 ON (albums_0.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = albums_0.genre_id)'

    c.many_to_many :genres, :clone=>:genres, :join_table=>:ag___genres
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS genres_0 ON (genres_0.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = genres_0.genre_id)'
  end
  
  it "should correctly handle an aliased join table in many_to_many and one_through_one" do
    c = Class.new(GraphAlbum)
    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:ga)
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ga.genre_id)'

    c.many_to_many :genre, :clone=>:genre, :join_table=>Sequel[:ag].as(:ga)
    c.eager_graph(:genre).sql.must_equal 'SELECT albums.id, albums.band_id, genre.id AS genre_id FROM albums LEFT OUTER JOIN ag AS ga ON (ga.album_id = albums.id) LEFT OUTER JOIN genres AS genre ON (genre.id = ga.genre_id)'

    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:albums)
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS albums_0 ON (albums_0.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = albums_0.genre_id)'

    c.many_to_many :genres, :clone=>:genres, :join_table=>Sequel[:ag].as(:genres)
    c.eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag AS genres_0 ON (genres_0.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = genres_0.genre_id)'
  end
  
  it "should handle multiple associations in a single call to association_join" do
    GraphAlbum.association_join(:genres, :tracks, :band).sql.must_equal 'SELECT * FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres ON (genres.id = ag.genre_id) INNER JOIN tracks ON (tracks.album_id = albums.id) INNER JOIN bands AS band ON (band.id = albums.band_id)'
  end

  it "should eagerly load multiple associations in a single call" do 
    ds = GraphAlbum.eager_graph(:genres, :tracks, :band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id, tracks.id AS tracks_id, tracks.album_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>4, :tracks_id=>3, :album_id=>1, :band_id_0=>2, :vocalist_id=>6).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.tracks.must_equal [GraphTrack.load({:id => 3, :album_id=>1})]
    a.genres.must_equal [GraphGenre.load(:id => 4)]
  end

  it "should eagerly load multiple associations with different limit strategies in a single call" do 
    subg = Class.new(GraphGenre)
    subg.dataset = subg.dataset.with_extend do
      def supports_distinct_on?; true end
      def supports_window_functions?; true end
      def columns; literal(opts[:select]) =~ /x_foreign_key_x/ ? [:id, :x_foreign_key_x] : [:id] end
    end
    GraphAlbum.one_through_one :lgenre, :clone=>:genre, :class=>subg
    GraphAlbum.many_to_many :lgenres, :clone=>:genres, :class=>subg, :limit=>2

    ds = GraphAlbum.eager_graph_with_options([:lgenre, :lgenres], :limit_strategy=>{:lgenre=>:distinct_on, :lgenres=>:window_function})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, lgenre.id AS lgenre_id, lgenres.id AS lgenres_id FROM albums LEFT OUTER JOIN (SELECT DISTINCT ON (ag.album_id) genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) ORDER BY ag.album_id) AS lgenre ON (lgenre.x_foreign_key_x = albums.id) LEFT OUTER JOIN (SELECT id, x_foreign_key_x FROM (SELECT genres.*, ag.album_id AS x_foreign_key_x, row_number() OVER (PARTITION BY ag.album_id) AS x_sequel_row_number_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id)) AS t1 WHERE (x_sequel_row_number_x <= 2)) AS lgenres ON (lgenres.x_foreign_key_x = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :lgenres_id=>4, :lgenre_id=>3).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.lgenre.must_equal subg.load(:id => 3)
    a.lgenres.must_equal [subg.load(:id => 4)]
  end
  
  it "should handle multiple associations in separate calls to association_join" do
    GraphAlbum.association_join(:genres).association_join(:tracks).association_join(:band).sql.must_equal 'SELECT * FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres ON (genres.id = ag.genre_id) INNER JOIN tracks ON (tracks.album_id = albums.id) INNER JOIN bands AS band ON (band.id = albums.band_id)'
  end

  it "should eagerly load multiple associations in separate calls" do 
    ds = GraphAlbum.eager_graph(:genres).eager_graph(:tracks).eager_graph(:band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id, tracks.id AS tracks_id, tracks.album_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>4, :tracks_id=>3, :album_id=>1, :band_id_0=>2, :vocalist_id=>6).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.tracks.must_equal [GraphTrack.load({:id => 3, :album_id=>1})]
    a.genres.must_equal [GraphGenre.load(:id => 4)]
  end

  it "should handle cascading associations in a single call to association_join" do
    GraphTrack.association_join(:album=>{:band=>:members}).sql.must_equal 'SELECT * FROM tracks INNER JOIN albums AS album ON (album.id = tracks.album_id) INNER JOIN bands AS band ON (band.id = album.band_id) INNER JOIN bm ON (bm.band_id = band.id) INNER JOIN members ON (members.id = bm.member_id)'
    GraphBand.association_join({:albums=>:tracks}, :members).sql.must_equal 'SELECT * FROM bands INNER JOIN albums ON (albums.band_id = bands.id) INNER JOIN tracks ON (tracks.album_id = albums.id) INNER JOIN bm ON (bm.band_id = bands.id) INNER JOIN members ON (members.id = bm.member_id)'
  end

  it "should handle matching association names for different models when using association_join" do
    GraphAlbum.association_join(:genres).association_join(:band=>:genres).sql.must_equal 'SELECT * FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres ON (genres.id = ag.genre_id) INNER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN bg ON (bg.band_id = band.id) INNER JOIN genres AS genres_0 ON (genres_0.id = bg.genre_id)'
  end

  it "should allow cascading of eager loading for associations of associated models" do
    ds = GraphTrack.eager_graph(:album=>{:band=>:members})
    ds.sql.must_equal 'SELECT tracks.id, tracks.album_id, album.id AS album_id_0, album.band_id, band.id AS band_id_0, band.vocalist_id, members.id AS members_id FROM tracks LEFT OUTER JOIN albums AS album ON (album.id = tracks.album_id) LEFT OUTER JOIN bands AS band ON (band.id = album.band_id) LEFT OUTER JOIN bm ON (bm.band_id = band.id) LEFT OUTER JOIN members ON (members.id = bm.member_id)'
    a = ds.with_fetch(:id=>3, :album_id=>1, :album_id_0=>1, :band_id=>2, :members_id=>5, :band_id_0=>2, :vocalist_id=>6).all
    a.must_equal [GraphTrack.load(:id => 3, :album_id => 1)]
    a = a.first
    a.album.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.album.band.members.must_equal [GraphBandMember.load(:id => 5)]
  end
  
  it "should allow cascading of eager loading for multiple *_to_many associations, eliminating duplicates caused by cartesian products" do
    ds = GraphBand.eager_graph({:albums=>:tracks}, :members)
    ds.sql.must_equal 'SELECT bands.id, bands.vocalist_id, albums.id AS albums_id, albums.band_id, tracks.id AS tracks_id, tracks.album_id, members.id AS members_id FROM bands LEFT OUTER JOIN albums ON (albums.band_id = bands.id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) LEFT OUTER JOIN bm ON (bm.band_id = bands.id) LEFT OUTER JOIN members ON (members.id = bm.member_id)'
    a = ds.with_fetch([{:id=>1, :vocalist_id=>2, :albums_id=>3, :band_id=>1, :tracks_id=>4, :album_id=>3, :members_id=>5},
      {:id=>1, :vocalist_id=>2, :albums_id=>3, :band_id=>1, :tracks_id=>4, :album_id=>3, :members_id=>6},
      {:id=>1, :vocalist_id=>2, :albums_id=>3, :band_id=>1, :tracks_id=>5, :album_id=>3, :members_id=>5},
      {:id=>1, :vocalist_id=>2, :albums_id=>3, :band_id=>1, :tracks_id=>5, :album_id=>3, :members_id=>6},
      {:id=>1, :vocalist_id=>2, :albums_id=>4, :band_id=>1, :tracks_id=>6, :album_id=>4, :members_id=>5},
      {:id=>1, :vocalist_id=>2, :albums_id=>4, :band_id=>1, :tracks_id=>6, :album_id=>4, :members_id=>6},
      {:id=>1, :vocalist_id=>2, :albums_id=>4, :band_id=>1, :tracks_id=>7, :album_id=>4, :members_id=>5},
      {:id=>1, :vocalist_id=>2, :albums_id=>4, :band_id=>1, :tracks_id=>7, :album_id=>4, :members_id=>6},
      {:id=>2, :vocalist_id=>2, :albums_id=>5, :band_id=>2, :tracks_id=>8, :album_id=>5, :members_id=>5},
      {:id=>2, :vocalist_id=>2, :albums_id=>5, :band_id=>2, :tracks_id=>8, :album_id=>5, :members_id=>6},
      {:id=>2, :vocalist_id=>2, :albums_id=>5, :band_id=>2, :tracks_id=>9, :album_id=>5, :members_id=>5},
      {:id=>2, :vocalist_id=>2, :albums_id=>5, :band_id=>2, :tracks_id=>9, :album_id=>5, :members_id=>6},
      {:id=>2, :vocalist_id=>2, :albums_id=>6, :band_id=>2, :tracks_id=>1, :album_id=>6, :members_id=>5},
      {:id=>2, :vocalist_id=>2, :albums_id=>6, :band_id=>2, :tracks_id=>1, :album_id=>6, :members_id=>6},
      {:id=>2, :vocalist_id=>2, :albums_id=>6, :band_id=>2, :tracks_id=>2, :album_id=>6, :members_id=>5},
      {:id=>2, :vocalist_id=>2, :albums_id=>6, :band_id=>2, :tracks_id=>2, :album_id=>6, :members_id=>6}]).all
    a.must_equal [GraphBand.load(:id=>1, :vocalist_id=>2), GraphBand.load(:id=>2, :vocalist_id=>2)]
    members = a.map{|x| x.members}
    members.must_equal [[GraphBandMember.load(:id=>5), GraphBandMember.load(:id=>6)], [GraphBandMember.load(:id=>5), GraphBandMember.load(:id=>6)]]
    albums = a.map{|x| x.albums}
    albums.must_equal [[GraphAlbum.load(:id=>3, :band_id=>1), GraphAlbum.load(:id=>4, :band_id=>1)], [GraphAlbum.load(:id=>5, :band_id=>2), GraphAlbum.load(:id=>6, :band_id=>2)]]
    tracks = albums.map{|x| x.map{|y| y.tracks}}
    tracks.must_equal [[[GraphTrack.load(:id=>4, :album_id=>3), GraphTrack.load(:id=>5, :album_id=>3)], [GraphTrack.load(:id=>6, :album_id=>4), GraphTrack.load(:id=>7, :album_id=>4)]], [[GraphTrack.load(:id=>8, :album_id=>5), GraphTrack.load(:id=>9, :album_id=>5)], [GraphTrack.load(:id=>1, :album_id=>6), GraphTrack.load(:id=>2, :album_id=>6)]]]
  end
  
  it "should populate the reciprocal many_to_one association when eagerly loading the one_to_many association" do
    DB.reset
    ds = GraphAlbum.eager_graph(:tracks)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :tracks_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.tracks.must_equal [GraphTrack.load(:id => 3, :album_id=>1)]
    a.tracks.first.album.must_equal a
    DB.sqls.must_equal ['SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)']
  end

  it "should eager load multiple associations from the same table" do
    ds = GraphBand.eager_graph(:vocalist, :members)
    ds.sql.must_equal 'SELECT bands.id, bands.vocalist_id, vocalist.id AS vocalist_id_0, members.id AS members_id FROM bands LEFT OUTER JOIN members AS vocalist ON (vocalist.id = bands.vocalist_id) LEFT OUTER JOIN bm ON (bm.band_id = bands.id) LEFT OUTER JOIN members ON (members.id = bm.member_id)'
    a = ds.with_fetch(:id=>2, :vocalist_id=>6, :vocalist_id_0=>6, :members_id=>5).all
    a.must_equal [GraphBand.load(:id => 2, :vocalist_id => 6)]
    a = a.first
    a.vocalist.must_equal GraphBandMember.load(:id => 6)
    a.members.must_equal [GraphBandMember.load(:id => 5)]
  end

  it "should give you a plain hash when called without .all" do 
    ds = GraphAlbum.eager_graph(:band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    ds.with_fetch(:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>3).first.must_equal(:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>3)
  end

  it "should not drop any associated objects if the graph could not be a cartesian product" do
    ds = GraphBand.eager_graph(:members, :vocalist)
    ds.sql.must_equal 'SELECT bands.id, bands.vocalist_id, members.id AS members_id, vocalist.id AS vocalist_id_0 FROM bands LEFT OUTER JOIN bm ON (bm.band_id = bands.id) LEFT OUTER JOIN members ON (members.id = bm.member_id) LEFT OUTER JOIN members AS vocalist ON (vocalist.id = bands.vocalist_id)'
    a = ds.with_fetch([{:id=>2, :vocalist_id=>6, :members_id=>5, :vocalist_id_0=>6}, {:id=>2, :vocalist_id=>6, :members_id=>5, :vocalist_id_0=>6}]).all
    a.must_equal [GraphBand.load(:id => 2, :vocalist_id => 6)]
    a = a.first
    a.vocalist.must_equal GraphBandMember.load(:id => 6)
    a.members.must_equal [GraphBandMember.load(:id => 5), GraphBandMember.load(:id => 5)]
  end

  it "should respect the :cartesian_product_number option" do 
    GraphBand.many_to_one :other_vocalist, :class=>'GraphBandMember', :key=>:vocalist_id, :cartesian_product_number=>1
    ds = GraphBand.eager_graph(:members, :other_vocalist)
    ds.sql.must_equal 'SELECT bands.id, bands.vocalist_id, members.id AS members_id, other_vocalist.id AS other_vocalist_id FROM bands LEFT OUTER JOIN bm ON (bm.band_id = bands.id) LEFT OUTER JOIN members ON (members.id = bm.member_id) LEFT OUTER JOIN members AS other_vocalist ON (other_vocalist.id = bands.vocalist_id)'
    a = ds.with_fetch([{:id=>2, :vocalist_id=>6, :members_id=>5, :other_vocalist_id=>6}, {:id=>2, :vocalist_id=>6, :members_id=>5, :other_vocalist_id=>6}]).all
    a.must_equal [GraphBand.load(:id=>2, :vocalist_id => 6)]
    a.first.other_vocalist.must_equal GraphBandMember.load(:id=>6)
    a.first.members.must_equal [GraphBandMember.load(:id=>5)]
  end

  it "should drop duplicate items that occur in sequence if the graph could be a cartesian product" do
    ds = GraphBand.eager_graph(:members, :genres)
    ds.sql.must_equal 'SELECT bands.id, bands.vocalist_id, members.id AS members_id, genres.id AS genres_id FROM bands LEFT OUTER JOIN bm ON (bm.band_id = bands.id) LEFT OUTER JOIN members ON (members.id = bm.member_id) LEFT OUTER JOIN bg ON (bg.band_id = bands.id) LEFT OUTER JOIN genres ON (genres.id = bg.genre_id)'
    a = ds.with_fetch([{:id=>2, :vocalist_id=>6, :members_id=>5, :genres_id=>7},
      {:id=>2, :vocalist_id=>6, :members_id=>5, :genres_id=>8},
      {:id=>2, :vocalist_id=>6, :members_id=>6, :genres_id=>7},
      {:id=>2, :vocalist_id=>6, :members_id=>6, :genres_id=>8}]).all
    a.must_equal [GraphBand.load(:id => 2, :vocalist_id => 6)]
    a = a.first
    a.members.must_equal [GraphBandMember.load(:id => 5), GraphBandMember.load(:id => 6)]
    a.genres.must_equal [GraphGenre.load(:id => 7), GraphGenre.load(:id => 8)]
  end

  it "should be able to be used in combination with #eager" do
    DB.reset
    ds = GraphAlbum.eager_graph(:tracks).eager(:genres)
    GraphGenre.dataset = GraphGenre.dataset.with_fetch(:id=>6, :x_foreign_key_x=>1)
    a = ds.with_fetch(:id=>1, :band_id=>2, :tracks_id=>3, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.tracks.must_equal [GraphTrack.load(:id=>3, :album_id=>1)]
    a.genres.must_equal [GraphGenre.load(:id => 6)]
    DB.sqls.must_equal ['SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)',
    "SELECT genres.*, ag.album_id AS x_foreign_key_x FROM genres INNER JOIN ag ON (ag.genre_id = genres.id) WHERE (ag.album_id IN (1))"]
  end

  it "should handle no associated records for a single many_to_one association" do
    ds = GraphAlbum.eager_graph(:band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :band_id_0=>nil, :vocalist_id=>nil).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.band.must_be_nil
  end

  it "should handle no associated records for a single one_to_one association" do
    ds = GraphAlbum.eager_graph(:track)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, track.id AS track_id, track.album_id FROM albums LEFT OUTER JOIN tracks AS track ON (track.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :track_id=>nil, :album_id=>nil).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.track.must_be_nil
  end

  it "should handle no associated records for a single one_to_many association" do
    ds = GraphAlbum.eager_graph(:tracks)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, tracks.id AS tracks_id, tracks.album_id FROM albums LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :tracks_id=>nil, :album_id=>nil).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.tracks.must_equal []
  end

  it "should handle no associated records for a single one_through_one association" do
    ds = GraphAlbum.eager_graph(:genre)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genre.id AS genre_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genre ON (genre.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>nil).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genre.must_be_nil
  end

  it "should handle no associated records for a single many_to_many association" do
    ds = GraphAlbum.eager_graph(:genres)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>nil).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genres.must_equal []
  end

  it "should handle missing associated records when loading multiple associations" do 
    ds = GraphAlbum.eager_graph(:genres, :tracks, :band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id, tracks.id AS tracks_id, tracks.album_id, band.id AS band_id_0, band.vocalist_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres ON (genres.id = ag.genre_id) LEFT OUTER JOIN tracks ON (tracks.album_id = albums.id) LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch([{:id=>1, :band_id=>2, :genres_id=>nil, :tracks_id=>3, :album_id=>1, :band_id_0=>nil, :vocalist_id=>nil},
      {:id=>1, :band_id=>2, :genres_id=>nil, :tracks_id=>4, :album_id=>1, :band_id_0=>nil, :vocalist_id=>nil},
      {:id=>1, :band_id=>2, :genres_id=>nil, :tracks_id=>5, :album_id=>1, :band_id_0=>nil, :vocalist_id=>nil},
      {:id=>1, :band_id=>2, :genres_id=>nil, :tracks_id=>6, :album_id=>1, :band_id_0=>nil, :vocalist_id=>nil}]).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a = a.first
    a.tracks.must_equal [GraphTrack.load(:id => 3, :album_id => 1), GraphTrack.load(:id => 4, :album_id => 1), GraphTrack.load(:id => 5, :album_id => 1), GraphTrack.load(:id => 6, :album_id => 1)]
    a.band.must_be_nil
    a.genres.must_equal []
  end

  it "should handle missing associated records when cascading eager loading for associations of associated models" do
    ds = GraphTrack.eager_graph(:album=>{:band=>:members})
    ds.sql.must_equal 'SELECT tracks.id, tracks.album_id, album.id AS album_id_0, album.band_id, band.id AS band_id_0, band.vocalist_id, members.id AS members_id FROM tracks LEFT OUTER JOIN albums AS album ON (album.id = tracks.album_id) LEFT OUTER JOIN bands AS band ON (band.id = album.band_id) LEFT OUTER JOIN bm ON (bm.band_id = band.id) LEFT OUTER JOIN members ON (members.id = bm.member_id)'
    a = ds.with_fetch([{:id=>2, :album_id=>2, :album_id_0=>nil, :band_id=>nil, :members_id=>nil, :band_id_0=>nil, :vocalist_id=>nil},
      {:id=>3, :album_id=>3, :album_id_0=>3, :band_id=>3, :members_id=>nil, :band_id_0=>nil, :vocalist_id=>nil},
      {:id=>4, :album_id=>4, :album_id_0=>4, :band_id=>2, :members_id=>nil, :band_id_0=>2, :vocalist_id=>6},
      {:id=>5, :album_id=>1, :album_id_0=>1, :band_id=>4, :members_id=>5, :band_id_0=>4, :vocalist_id=>8},
      {:id=>5, :album_id=>1, :album_id_0=>1, :band_id=>4, :members_id=>6, :band_id_0=>4, :vocalist_id=>8}]).all
    a.must_equal [GraphTrack.load(:id => 2, :album_id => 2), GraphTrack.load(:id => 3, :album_id => 3), GraphTrack.load(:id => 4, :album_id => 4), GraphTrack.load(:id => 5, :album_id => 1)]
    a.map{|x| x.album}.must_equal [nil, GraphAlbum.load(:id => 3, :band_id => 3), GraphAlbum.load(:id => 4, :band_id => 2), GraphAlbum.load(:id => 1, :band_id => 4)]
    a.map{|x| x.album.band if x.album}.must_equal [nil, nil, GraphBand.load(:id => 2, :vocalist_id=>6), GraphBand.load(:id => 4, :vocalist_id=>8)]
    a.map{|x| x.album.band.members if x.album && x.album.band}.must_equal [nil, nil, [], [GraphBandMember.load(:id => 5), GraphBandMember.load(:id => 6)]]
  end

  it "should respect the association's :primary_key option" do 
    GraphAlbum.many_to_one :inner_band, :class=>'GraphBand', :key=>:band_id, :primary_key=>:vocalist_id
    ds = GraphAlbum.eager_graph(:inner_band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, inner_band.id AS inner_band_id, inner_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS inner_band ON (inner_band.vocalist_id = albums.band_id)'
    as = ds.with_fetch(:id=>3, :band_id=>2, :inner_band_id=>5, :vocalist_id=>2).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.inner_band.must_equal GraphBand.load(:id=>5, :vocalist_id=>2)

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :primary_key=>:band_id, :reciprocal=>nil
    ds = GraphAlbum.eager_graph(:right_tracks)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.band_id)'
    as = ds.with_fetch([{:id=>3, :band_id=>2, :right_tracks_id=>5, :album_id=>2}, {:id=>3, :band_id=>2, :right_tracks_id=>6, :album_id=>2}]).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.right_tracks.must_equal [GraphTrack.load(:id=>5, :album_id=>2), GraphTrack.load(:id=>6, :album_id=>2)]
  end
  
  it "should respect many_to_one association's composite keys" do 
    GraphAlbum.many_to_one :inner_band, :class=>'GraphBand', :key=>[:band_id, :id], :primary_key=>[:vocalist_id, :id]
    ds = GraphAlbum.eager_graph(:inner_band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, inner_band.id AS inner_band_id, inner_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS inner_band ON ((inner_band.vocalist_id = albums.band_id) AND (inner_band.id = albums.id))'
    as = ds.with_fetch(:id=>3, :band_id=>2, :inner_band_id=>3, :vocalist_id=>2).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.inner_band.must_equal GraphBand.load(:id=>3, :vocalist_id=>2)
  end

  it "should respect one_to_many association's composite keys" do 
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>[:album_id, :id], :primary_key=>[:band_id, :id]
    ds = GraphAlbum.eager_graph(:right_tracks)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON ((right_tracks.album_id = albums.band_id) AND (right_tracks.id = albums.id))'
    as = ds.with_fetch(:id=>3, :band_id=>2, :right_tracks_id=>3, :album_id=>2).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.right_tracks.must_equal [GraphTrack.load(:id=>3, :album_id=>2)]
  end
  
  it "should respect many_to_many association's composite keys" do 
    GraphAlbum.many_to_many :sbands, :class=>'GraphBand', :left_key=>[:l1, :l2], :left_primary_key=>[:band_id, :id], :right_key=>[:r1, :r2], :right_primary_key=>[:vocalist_id, :id], :join_table=>:b
    ds = GraphAlbum.eager_graph(:sbands)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, sbands.id AS sbands_id, sbands.vocalist_id FROM albums LEFT OUTER JOIN b ON ((b.l1 = albums.band_id) AND (b.l2 = albums.id)) LEFT OUTER JOIN bands AS sbands ON ((sbands.vocalist_id = b.r1) AND (sbands.id = b.r2))'
    as = ds.with_fetch([{:id=>3, :band_id=>2, :sbands_id=>5, :vocalist_id=>6}, {:id=>3, :band_id=>2, :sbands_id=>6, :vocalist_id=>22}]).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.sbands.must_equal [GraphBand.load(:id=>5, :vocalist_id=>6), GraphBand.load(:id=>6, :vocalist_id=>22)]
  end

  it "should respect many_to_many association's :left_primary_key and :right_primary_key options" do 
    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :left_primary_key=>:band_id, :right_key=>:genre_id, :right_primary_key=>:xxx, :join_table=>:ag
    ds = GraphAlbum.eager_graph(:inner_genres)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, inner_genres.id AS inner_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.band_id) LEFT OUTER JOIN genres AS inner_genres ON (inner_genres.xxx = ag.genre_id)'
    as = ds.with_fetch([{:id=>3, :band_id=>2, :inner_genres_id=>5, :xxx=>12}, {:id=>3, :band_id=>2, :inner_genres_id=>6, :xxx=>22}]).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.inner_genres.must_equal [GraphGenre.load(:id=>5), GraphGenre.load(:id=>6)]
  end

  it "should respect composite primary keys for classes when eager loading" do 
    c1 = Class.new(GraphAlbum)
    c2 = Class.new(GraphBand)
    c1.set_primary_key [:band_id, :id]
    c2.set_primary_key [:vocalist_id, :id]
    c1.many_to_many :sbands, :class=>c2, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :join_table=>:b
    c2.one_to_many :salbums, :class=>c1, :key=>[:band_id, :id]
    ds = c1.eager_graph(:sbands=>:salbums)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, sbands.id AS sbands_id, sbands.vocalist_id, salbums.id AS salbums_id, salbums.band_id AS salbums_band_id FROM albums LEFT OUTER JOIN b ON ((b.l1 = albums.band_id) AND (b.l2 = albums.id)) LEFT OUTER JOIN bands AS sbands ON ((sbands.vocalist_id = b.r1) AND (sbands.id = b.r2)) LEFT OUTER JOIN albums AS salbums ON ((salbums.band_id = sbands.vocalist_id) AND (salbums.id = sbands.id))'
    as = ds.with_fetch([{:id=>3, :band_id=>2, :sbands_id=>5, :vocalist_id=>6, :salbums_id=>7, :salbums_band_id=>8},
      {:id=>3, :band_id=>2, :sbands_id=>5, :vocalist_id=>6, :salbums_id=>9, :salbums_band_id=>10},
      {:id=>3, :band_id=>2, :sbands_id=>6, :vocalist_id=>22, :salbums_id=>nil, :salbums_band_id=>nil},
      {:id=>7, :band_id=>8, :sbands_id=>nil, :vocalist_id=>nil, :salbums_id=>nil, :salbums_band_id=>nil}]).all
    as.must_equal [c1.load(:id=>3, :band_id=>2), c1.load(:id=>7, :band_id=>8)]
    as.map{|x| x.sbands}.must_equal [[c2.load(:id=>5, :vocalist_id=>6), c2.load(:id=>6, :vocalist_id=>22)], []]
    as.map{|x| x.sbands.map{|y| y.salbums}}.must_equal [[[c1.load(:id=>7, :band_id=>8), c1.load(:id=>9, :band_id=>10)], []], []]
  end

  it "should respect the association's :graph_select option" do 
    GraphAlbum.many_to_one :inner_band, :class=>'GraphBand', :key=>:band_id, :graph_select=>:vocalist_id
    GraphAlbum.eager_graph(:inner_band).sql.must_equal 'SELECT albums.id, albums.band_id, inner_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS inner_band ON (inner_band.id = albums.band_id)'

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_select=>[:album_id]
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id)'

    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_select=>[]
    GraphAlbum.eager_graph(:inner_genres).sql.must_equal 'SELECT albums.id, albums.band_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS inner_genres ON (inner_genres.id = ag.genre_id)'
  end

  it "should respect the association's :graph_alias_base option" do 
    GraphAlbum.many_to_one :inner_band, :class=>'GraphBand', :key=>:band_id, :graph_alias_base=>:foo
    ds = GraphAlbum.eager_graph(:inner_band)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, foo.id AS foo_id, foo.vocalist_id FROM albums LEFT OUTER JOIN bands AS foo ON (foo.id = albums.band_id)'
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_alias_base=>:foo
    ds.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, foo.id AS foo_id, foo.vocalist_id, foo_0.id AS foo_0_id, foo_0.album_id FROM albums LEFT OUTER JOIN bands AS foo ON (foo.id = albums.band_id) LEFT OUTER JOIN tracks AS foo_0 ON (foo_0.album_id = albums.id)'
  end

  it "should respect the association's :graph_join_type option" do 
    GraphAlbum.many_to_one :inner_band, :class=>'GraphBand', :key=>:band_id, :graph_join_type=>:inner
    GraphAlbum.eager_graph(:inner_band).sql.must_equal 'SELECT albums.id, albums.band_id, inner_band.id AS inner_band_id, inner_band.vocalist_id FROM albums INNER JOIN bands AS inner_band ON (inner_band.id = albums.band_id)'

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_join_type=>:right_outer
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums RIGHT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id)'

    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_type=>:inner
    GraphAlbum.eager_graph(:inner_genres).sql.must_equal 'SELECT albums.id, albums.band_id, inner_genres.id AS inner_genres_id FROM albums INNER JOIN ag ON (ag.album_id = albums.id) INNER JOIN genres AS inner_genres ON (inner_genres.id = ag.genre_id)'
  end

  it "should respect the association's :graph_join_table_join_type option" do 
    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_table_join_type=>:inner
    GraphAlbum.eager_graph(:inner_genres).sql.must_equal 'SELECT albums.id, albums.band_id, inner_genres.id AS inner_genres_id FROM albums INNER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS inner_genres ON (inner_genres.id = ag.genre_id)'

    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_table_join_type=>:inner, :graph_join_type=>:right_outer
    GraphAlbum.eager_graph(:inner_genres).sql.must_equal 'SELECT albums.id, albums.band_id, inner_genres.id AS inner_genres_id FROM albums INNER JOIN ag ON (ag.album_id = albums.id) RIGHT OUTER JOIN genres AS inner_genres ON (inner_genres.id = ag.genre_id)'
  end

  it "should respect the association's :conditions option" do 
    GraphAlbum.many_to_one :active_band, :class=>'GraphBand', :key=>:band_id, :conditions=>{:active=>true}
    GraphAlbum.eager_graph(:active_band).sql.must_equal "SELECT albums.id, albums.band_id, active_band.id AS active_band_id, active_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS active_band ON ((active_band.id = albums.band_id) AND (active_band.active IS TRUE))"

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :conditions=>{:id=>(0..100)}, :reciprocal=>nil
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON ((right_tracks.album_id = albums.id) AND (right_tracks.id >= 0) AND (right_tracks.id <= 100))'

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :conditions=>{true=>:active}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS active_genres ON ((active_genres.id = ag.genre_id) AND ('t' = ag.active))"
  end

  it "should respect the association's :graph_conditions option" do 
    GraphAlbum.many_to_one :active_band, :class=>'GraphBand', :key=>:band_id, :graph_conditions=>{:active=>true}
    GraphAlbum.eager_graph(:active_band).sql.must_equal "SELECT albums.id, albums.band_id, active_band.id AS active_band_id, active_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS active_band ON ((active_band.id = albums.band_id) AND (active_band.active IS TRUE))"

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_conditions=>{:id=>(0..100)}
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON ((right_tracks.album_id = albums.id) AND (right_tracks.id >= 0) AND (right_tracks.id <= 100))'

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_conditions=>{true=>:active}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS active_genres ON ((active_genres.id = ag.genre_id) AND ('t' = ag.active))"
  end

  it "should respect the association's :graph_join_table_conditions option" do 
    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_table_conditions=>{:active=>true}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON ((ag.album_id = albums.id) AND (ag.active IS TRUE)) LEFT OUTER JOIN genres AS active_genres ON (active_genres.id = ag.genre_id)"

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_conditions=>{true=>:active}, :graph_join_table_conditions=>{true=>:active}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON ((ag.album_id = albums.id) AND ('t' = albums.active)) LEFT OUTER JOIN genres AS active_genres ON ((active_genres.id = ag.genre_id) AND ('t' = ag.active))"
  end

  it "should respect the association's :graph_block option" do 
    GraphAlbum.many_to_one :active_band, :class=>'GraphBand', :key=>:band_id, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}
    GraphAlbum.eager_graph(:active_band).sql.must_equal "SELECT albums.id, albums.band_id, active_band.id AS active_band_id, active_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS active_band ON ((active_band.id = albums.band_id) AND (active_band.active IS TRUE))"

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :id)=>(0..100)}}
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON ((right_tracks.album_id = albums.id) AND (right_tracks.id >= 0) AND (right_tracks.id <= 100))'

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_block=>proc{|ja,lja,js| {true=>Sequel.qualify(lja, :active)}}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS active_genres ON ((active_genres.id = ag.genre_id) AND ('t' = ag.active))"
  end

  it "should respect the association's :graph_join_table_block option" do 
    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_table_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :active)=>true}}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON ((ag.album_id = albums.id) AND (ag.active IS TRUE)) LEFT OUTER JOIN genres AS active_genres ON (active_genres.id = ag.genre_id)"

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_block=>proc{|ja,lja,js| {true=>Sequel.qualify(lja, :active)}}, :graph_join_table_block=>proc{|ja,lja,js| {true=>Sequel.qualify(lja, :active)}}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON ((ag.album_id = albums.id) AND ('t' = albums.active)) LEFT OUTER JOIN genres AS active_genres ON ((active_genres.id = ag.genre_id) AND ('t' = ag.active))"
  end

  it "should respect the association's :eager_grapher option" do 
    GraphAlbum.many_to_one :active_band, :class=>'GraphBand', :key=>:band_id, :eager_grapher=>proc{|eo| eo[:self].graph(GraphBand.dataset, {:active=>true}, :table_alias=>eo[:table_alias], :join_type=>:inner)}
    GraphAlbum.eager_graph(:active_band).sql.must_equal "SELECT albums.id, albums.band_id, active_band.id AS active_band_id, active_band.vocalist_id FROM albums INNER JOIN bands AS active_band ON (active_band.active IS TRUE)"

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :eager_grapher=>proc{|eo| eo[:self].graph(GraphTrack.dataset, nil, :join_type=>:natural, :table_alias=>eo[:table_alias])}
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums NATURAL JOIN tracks AS right_tracks'

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :eager_grapher=>proc{|eo| eo[:self].graph(:ag, {:album_id=>:id}, :table_alias=>:a123, :implicit_qualifier=>eo[:implicit_qualifier]).graph(GraphGenre.dataset, [:album_id], :table_alias=>eo[:table_alias])}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag AS a123 ON (a123.album_id = albums.id) LEFT OUTER JOIN genres AS active_genres USING (album_id)"
  end

  it "should respect the association's :graph_only_conditions option" do 
    GraphAlbum.many_to_one :active_band, :class=>'GraphBand', :key=>:band_id, :graph_only_conditions=>{:active=>true}
    GraphAlbum.eager_graph(:active_band).sql.must_equal "SELECT albums.id, albums.band_id, active_band.id AS active_band_id, active_band.vocalist_id FROM albums LEFT OUTER JOIN bands AS active_band ON (active_band.active IS TRUE)"

    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_only_conditions=>nil, :graph_join_type=>:natural
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums NATURAL JOIN tracks AS right_tracks'

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_only_conditions=>[:album_id]
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS active_genres USING (album_id)"
  end

  it "should respect the association's :graph_join_table_only_conditions option" do 
    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_join_table_only_conditions=>{:active=>true}
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.active IS TRUE) LEFT OUTER JOIN genres AS active_genres ON (active_genres.id = ag.genre_id)"

    GraphAlbum.many_to_many :active_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :graph_only_conditions=>(Sequel.expr(:price) + 2 > 100), :graph_join_table_only_conditions=>Sequel.identifier("active")
    GraphAlbum.eager_graph(:active_genres).sql.must_equal "SELECT albums.id, albums.band_id, active_genres.id AS active_genres_id FROM albums LEFT OUTER JOIN ag ON active LEFT OUTER JOIN genres AS active_genres ON ((price + 2) > 100)"
  end

  it "should create unique table aliases for all associations" do
    GraphAlbum.eager_graph(:previous_album=>{:previous_album=>:previous_album}).sql.must_equal "SELECT albums.id, albums.band_id, previous_album.id AS previous_album_id, previous_album.band_id AS previous_album_band_id, previous_album_0.id AS previous_album_0_id, previous_album_0.band_id AS previous_album_0_band_id, previous_album_1.id AS previous_album_1_id, previous_album_1.band_id AS previous_album_1_band_id FROM albums LEFT OUTER JOIN albums AS previous_album ON (previous_album.id = albums.previous_album_id) LEFT OUTER JOIN albums AS previous_album_0 ON (previous_album_0.id = previous_album.previous_album_id) LEFT OUTER JOIN albums AS previous_album_1 ON (previous_album_1.id = previous_album_0.previous_album_id)"
  end

  it "should respect the association's :order" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:id, :album_id]
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id) ORDER BY right_tracks.id, right_tracks.album_id'
  end

  with_symbol_splitting "should not qualify qualified symbols in association's :order" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[Sequel.desc(:blah__id), :blah__id]
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id) ORDER BY blah.id DESC, blah.id'
  end

  it "should only qualify unqualified symbols, identifiers, or ordered versions in association's :order" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[Sequel.identifier(:blah__id), Sequel.identifier(:blah__id).desc, Sequel[:blah][:id].desc, Sequel[:blah][:id], :album_id, Sequel.desc(:album_id), 1, Sequel.lit('RANDOM()'), Sequel.qualify(:b, :a)]
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id) ORDER BY right_tracks.blah__id, right_tracks.blah__id DESC, blah.id DESC, blah.id, right_tracks.album_id, right_tracks.album_id DESC, 1, RANDOM(), b.a'
  end

  it "should not respect the association's :order if :order_eager_graph is false" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:id, :album_id], :order_eager_graph=>false
    GraphAlbum.eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id)'
  end

  it "should add the association's :order to the existing order" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:id, :album_id]
    GraphAlbum.order(:band_id).eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id) ORDER BY band_id, right_tracks.id, right_tracks.album_id'
  end

  it "should use the association's :graph_order in preference or order" do
    GraphAlbum.one_to_many :right_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:tracks__id, :tracks__album_id], :graph_order=>[:id, :album_id]
    GraphAlbum.order(:band_id).eager_graph(:right_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, right_tracks.id AS right_tracks_id, right_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS right_tracks ON (right_tracks.album_id = albums.id) ORDER BY band_id, right_tracks.id, right_tracks.album_id'
  end

  it "should add the association's :order for cascading associations" do
    GraphBand.one_to_many :a_albums, :class=>'GraphAlbum', :key=>:band_id, :order=>:name, :reciprocal=>nil
    GraphAlbum.one_to_many :b_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:id, :album_id]
    GraphBand.eager_graph(:a_albums=>:b_tracks).sql.must_equal 'SELECT bands.id, bands.vocalist_id, a_albums.id AS a_albums_id, a_albums.band_id, b_tracks.id AS b_tracks_id, b_tracks.album_id FROM bands LEFT OUTER JOIN albums AS a_albums ON (a_albums.band_id = bands.id) LEFT OUTER JOIN tracks AS b_tracks ON (b_tracks.album_id = a_albums.id) ORDER BY a_albums.name, b_tracks.id, b_tracks.album_id'
    GraphAlbum.one_to_many :albums, :class=>'GraphAlbum', :key=>:band_id, :order=>[:band_id, :id]
    GraphAlbum.eager_graph(:albums=>{:albums=>:albums}).sql.must_equal 'SELECT albums.id, albums.band_id, albums_0.id AS albums_0_id, albums_0.band_id AS albums_0_band_id, albums_1.id AS albums_1_id, albums_1.band_id AS albums_1_band_id, albums_2.id AS albums_2_id, albums_2.band_id AS albums_2_band_id FROM albums LEFT OUTER JOIN albums AS albums_0 ON (albums_0.band_id = albums.id) LEFT OUTER JOIN albums AS albums_1 ON (albums_1.band_id = albums_0.id) LEFT OUTER JOIN albums AS albums_2 ON (albums_2.band_id = albums_1.id) ORDER BY albums_0.band_id, albums_0.id, albums_1.band_id, albums_1.id, albums_2.band_id, albums_2.id'
  end

  it "should add the associations :order for multiple associations" do
    GraphAlbum.many_to_many :a_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :order=>:id
    GraphAlbum.one_to_many :b_tracks, :class=>'GraphTrack', :key=>:album_id, :order=>[:id, :album_id]
    GraphAlbum.eager_graph(:a_genres, :b_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, a_genres.id AS a_genres_id, b_tracks.id AS b_tracks_id, b_tracks.album_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS a_genres ON (a_genres.id = ag.genre_id) LEFT OUTER JOIN tracks AS b_tracks ON (b_tracks.album_id = albums.id) ORDER BY a_genres.id, b_tracks.id, b_tracks.album_id'
  end

  it "should use the correct qualifier when graphing multiple tables with extra conditions" do
    GraphAlbum.many_to_many :a_genres, :class=>'GraphGenre', :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag
    GraphAlbum.one_to_many :b_tracks, :class=>'GraphTrack', :key=>:album_id, :graph_conditions=>{:a=>:b}
    GraphAlbum.eager_graph(:a_genres, :b_tracks).sql.must_equal 'SELECT albums.id, albums.band_id, a_genres.id AS a_genres_id, b_tracks.id AS b_tracks_id, b_tracks.album_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS a_genres ON (a_genres.id = ag.genre_id) LEFT OUTER JOIN tracks AS b_tracks ON ((b_tracks.album_id = albums.id) AND (b_tracks.a = albums.b))'
  end

  it "should eagerly load associated records for classes that do not have a primary key" do
    GraphAlbum.no_primary_key
    GraphGenre.no_primary_key
    GraphAlbum.many_to_many :inner_genres, :class=>'GraphGenre', :left_key=>:album_id, :left_primary_key=>:band_id, :right_key=>:genre_id, :right_primary_key=>:xxx, :join_table=>:ag
    ds = GraphAlbum.eager_graph(:inner_genres)
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, inner_genres.id AS inner_genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.band_id) LEFT OUTER JOIN genres AS inner_genres ON (inner_genres.xxx = ag.genre_id)'
    as = ds.with_fetch([{:id=>3, :band_id=>2, :inner_genres_id=>5, :xxx=>12}, {:id=>3, :band_id=>2, :inner_genres_id=>6, :xxx=>22}]).all
    as.must_equal [GraphAlbum.load(:id=>3, :band_id=>2)]
    as.first.inner_genres.must_equal [GraphGenre.load(:id=>5), GraphGenre.load(:id=>6)]
    GraphAlbum.set_primary_key :id
    GraphGenre.set_primary_key :id
  end
  
  it "should handle eager loading with schemas and aliases of different types" do
    GraphAlbum.eager_graph(:band).join(Sequel[:s][:genres], [:b_id]).eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(Sequel.qualify(:s, :genres), [:b_id]).eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(Sequel[:s][:b].as('genres'), [:b_id]).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.b AS genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(Sequel[:s][:b], [:b_id], :table_alias=>Sequel.identifier(:genres)).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.b AS genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(Sequel.identifier(:genres), [:b_id]).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join('genres', [:b_id]).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
  end
  
  with_symbol_splitting "should handle eager loading with splittable symbols" do
    GraphAlbum.eager_graph(:band).join(:s__genres, [:b_id]).eager_graph(:genres).sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(Sequel.expr(:s__b).as('genres'), [:b_id]).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.b AS genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
    GraphAlbum.eager_graph(:band).join(:s__b, [:b_id], :table_alias=>Sequel.identifier(:genres)).eager_graph(:genres).sql.must_equal  'SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, genres_0.id AS genres_0_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) INNER JOIN s.b AS genres USING (b_id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS genres_0 ON (genres_0.id = ag.genre_id)'
  end
  
  it "should raise errors if invalid aliases or table styles are used" do
    proc{GraphAlbum.from_self(:alias=>Sequel.qualify(:s, :bands)).eager_graph(:band)}.must_raise(Sequel::Error)
    proc{GraphAlbum.from(Sequel.lit('?', :bands)).eager_graph(:band)}.must_raise(Sequel::Error)
  end

  it "should eagerly load schema qualified tables correctly with joins" do
    c1 = Class.new(GraphAlbum)
    c2 = Class.new(GraphGenre)
    ds = c1.dataset.from(Sequel[:s][:a]).with_extend{def columns; [:id] end}
    c1.dataset = ds
    ds = c1.dataset
    c2.dataset = c2.dataset.from(Sequel[:s][:g])
    c1.many_to_many :a_genres, :class=>c2, :left_primary_key=>:id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>Sequel[:s][:ag]
    ds = c1.join(Sequel[:s][:t], [:b_id]).eager_graph(:a_genres)
    ds.sql.must_equal 'SELECT a.id, a_genres.id AS a_genres_id FROM (SELECT * FROM s.a INNER JOIN s.t USING (b_id)) AS a LEFT OUTER JOIN s.ag AS ag ON (ag.album_id = a.id) LEFT OUTER JOIN s.g AS a_genres ON (a_genres.id = ag.genre_id)'
    ds = c1.eager_graph(:a_genres)
    ds.sql.must_equal 'SELECT s.a.id, a_genres.id AS a_genres_id FROM s.a LEFT OUTER JOIN s.ag AS ag ON (ag.album_id = s.a.id) LEFT OUTER JOIN s.g AS a_genres ON (a_genres.id = ag.genre_id)'
  end

  with_symbol_splitting "should eagerly load schema qualified table symbols correctly with joins" do
    c1 = Class.new(GraphAlbum)
    c2 = Class.new(GraphGenre)
    ds = c1.dataset.from(:s__a).with_extend{def columns; [:id] end}
    c1.dataset = ds
    ds = c1.dataset
    c2.dataset = c2.dataset.from(:s__g)
    c1.many_to_many :a_genres, :class=>c2, :left_primary_key=>:id, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:s__ag
    ds = c1.join(:s__t, [:b_id]).eager_graph(:a_genres)
    ds.sql.must_equal 'SELECT a.id, a_genres.id AS a_genres_id FROM (SELECT * FROM s.a INNER JOIN s.t USING (b_id)) AS a LEFT OUTER JOIN s.ag AS ag ON (ag.album_id = a.id) LEFT OUTER JOIN s.g AS a_genres ON (a_genres.id = ag.genre_id)'
    ds = c1.eager_graph(:a_genres)
    ds.sql.must_equal 'SELECT s.a.id, a_genres.id AS a_genres_id FROM s.a LEFT OUTER JOIN s.ag AS ag ON (ag.album_id = s.a.id) LEFT OUTER JOIN s.g AS a_genres ON (a_genres.id = ag.genre_id)'
  end

  it "should respect :after_load callbacks on associations when eager graphing" do
    GraphAlbum.many_to_one :al_band, :class=>GraphBand, :key=>:band_id, :after_load=>proc{|o, a| a.id *=2}
    GraphAlbum.one_to_many :al_tracks, :class=>GraphTrack, :key=>:album_id, :after_load=>proc{|o, os| os.each{|a| a.id *=2}}
    GraphAlbum.many_to_many :al_genres, :class=>GraphGenre, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :after_load=>proc{|o, os| os.each{|a| a.id *=2}}
    ds = GraphAlbum.eager_graph(:al_band, :al_tracks, :al_genres)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, al_band.id AS al_band_id, al_band.vocalist_id, al_tracks.id AS al_tracks_id, al_tracks.album_id, al_genres.id AS al_genres_id FROM albums LEFT OUTER JOIN bands AS al_band ON (al_band.id = albums.band_id) LEFT OUTER JOIN tracks AS al_tracks ON (al_tracks.album_id = albums.id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS al_genres ON (al_genres.id = ag.genre_id)"
    a = ds.with_fetch(:id=>1, :band_id=>2, :al_band_id=>3, :vocalist_id=>4, :al_tracks_id=>5, :album_id=>6, :al_genres_id=>7).all.first
    a.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.al_band.must_equal GraphBand.load(:id=>6, :vocalist_id=>4)
    a.al_tracks.must_equal [GraphTrack.load(:id=>10, :album_id=>6)]
    a.al_genres.must_equal [GraphGenre.load(:id=>14)]
  end

  it "should respect limits on associations when eager graphing" do
    GraphAlbum.many_to_one :al_band, :class=>GraphBand, :key=>:band_id
    GraphAlbum.one_to_many :al_tracks, :class=>GraphTrack, :key=>:album_id, :limit=>2
    GraphAlbum.many_to_many :al_genres, :class=>GraphGenre, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>2
    ds = GraphAlbum.eager_graph(:al_band, :al_tracks, :al_genres)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, al_band.id AS al_band_id, al_band.vocalist_id, al_tracks.id AS al_tracks_id, al_tracks.album_id, al_genres.id AS al_genres_id FROM albums LEFT OUTER JOIN bands AS al_band ON (al_band.id = albums.band_id) LEFT OUTER JOIN tracks AS al_tracks ON (al_tracks.album_id = albums.id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS al_genres ON (al_genres.id = ag.genre_id)"
    a = ds.with_fetch([{:id=>1, :band_id=>2, :al_band_id=>3, :vocalist_id=>4, :al_tracks_id=>5, :album_id=>6, :al_genres_id=>7},
      {:id=>1, :band_id=>2, :al_band_id=>8, :vocalist_id=>9, :al_tracks_id=>10, :album_id=>11, :al_genres_id=>12},
      {:id=>1, :band_id=>2, :al_band_id=>13, :vocalist_id=>14, :al_tracks_id=>15, :album_id=>16, :al_genres_id=>17}]).all.first
    a.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.al_band.must_equal GraphBand.load(:id=>3, :vocalist_id=>4)
    a.al_tracks.must_equal [GraphTrack.load(:id=>5, :album_id=>6), GraphTrack.load(:id=>10, :album_id=>11)]
    a.al_genres.must_equal [GraphGenre.load(:id=>7), GraphGenre.load(:id=>12)]
  end

  it "should handle offsets on associations with no results when eager graphing" do
    GraphAlbum.one_to_many :al_tracks, :class=>GraphTrack, :key=>:album_id, :limit=>[2, 1]
    ds = GraphAlbum.eager_graph(:al_tracks)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, al_tracks.id AS al_tracks_id, al_tracks.album_id FROM albums LEFT OUTER JOIN tracks AS al_tracks ON (al_tracks.album_id = albums.id)"
    a = ds.with_fetch([{:id=>1, :band_id=>2, :al_tracks_id=>nil, :album_id=>nil}]).all.first
    a.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.al_tracks.must_equal []
  end

  it "should respect offsets on associations when eager graphing" do
    GraphAlbum.many_to_one :al_band, :class=>GraphBand, :key=>:band_id
    GraphAlbum.one_to_many :al_tracks, :class=>GraphTrack, :key=>:album_id, :limit=>[1, 1]
    GraphAlbum.many_to_many :al_genres, :class=>GraphGenre, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[1,1]
    ds = GraphAlbum.eager_graph(:al_band, :al_tracks, :al_genres)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, al_band.id AS al_band_id, al_band.vocalist_id, al_tracks.id AS al_tracks_id, al_tracks.album_id, al_genres.id AS al_genres_id FROM albums LEFT OUTER JOIN bands AS al_band ON (al_band.id = albums.band_id) LEFT OUTER JOIN tracks AS al_tracks ON (al_tracks.album_id = albums.id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS al_genres ON (al_genres.id = ag.genre_id)"
    a = ds.with_fetch([{:id=>1, :band_id=>2, :al_band_id=>3, :vocalist_id=>4, :al_tracks_id=>5, :album_id=>6, :al_genres_id=>7},
      {:id=>1, :band_id=>2, :al_band_id=>8, :vocalist_id=>9, :al_tracks_id=>10, :album_id=>11, :al_genres_id=>12},
      {:id=>1, :band_id=>2, :al_band_id=>13, :vocalist_id=>14, :al_tracks_id=>15, :album_id=>16, :al_genres_id=>17}]).all.first
    a.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.al_band.must_equal GraphBand.load(:id=>3, :vocalist_id=>4)
    a.al_tracks.must_equal [GraphTrack.load(:id=>10, :album_id=>11)]
    a.al_genres.must_equal [GraphGenre.load(:id=>12)]
  end

  it "should respect offsets on associations when eager graphing one_to_one and one_through_one associations" do
    GraphAlbum.many_to_one :al_band, :class=>GraphBand, :key=>:band_id
    GraphAlbum.one_to_one :al_track, :class=>GraphTrack, :key=>:album_id, :limit=>[nil, 1]
    GraphAlbum.one_through_one :al_genre, :class=>GraphGenre, :left_key=>:album_id, :right_key=>:genre_id, :join_table=>:ag, :limit=>[nil,1]
    ds = GraphAlbum.eager_graph(:al_band, :al_track, :al_genre)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, al_band.id AS al_band_id, al_band.vocalist_id, al_track.id AS al_track_id, al_track.album_id, al_genre.id AS al_genre_id FROM albums LEFT OUTER JOIN bands AS al_band ON (al_band.id = albums.band_id) LEFT OUTER JOIN tracks AS al_track ON (al_track.album_id = albums.id) LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN genres AS al_genre ON (al_genre.id = ag.genre_id)"
    a = ds.with_fetch([{:id=>1, :band_id=>2, :al_band_id=>3, :vocalist_id=>4, :al_track_id=>5, :album_id=>6, :al_genre_id=>7},
      {:id=>1, :band_id=>2, :al_band_id=>8, :vocalist_id=>9, :al_track_id=>10, :album_id=>11, :al_genre_id=>12},
      {:id=>1, :band_id=>2, :al_band_id=>13, :vocalist_id=>14, :al_track_id=>15, :album_id=>16, :al_genre_id=>17}]).all.first
    a.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.al_band.must_equal GraphBand.load(:id=>3, :vocalist_id=>4)
    a.al_track.must_equal GraphTrack.load(:id=>10, :album_id=>11)
    a.al_genre.must_equal GraphGenre.load(:id=>12)
  end

  it "should not include duplicate objects when eager graphing many_to_one=>one_to_many" do
    ds = GraphAlbum.eager_graph(:band=>:albums)
    ds.sql.must_equal "SELECT albums.id, albums.band_id, band.id AS band_id_0, band.vocalist_id, albums_0.id AS albums_0_id, albums_0.band_id AS albums_0_band_id FROM albums LEFT OUTER JOIN bands AS band ON (band.id = albums.band_id) LEFT OUTER JOIN albums AS albums_0 ON (albums_0.band_id = band.id)"
    a = ds.with_fetch([
      {:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>1, :albums_0_id=>1, :albums_0_band_id=>2},
      {:id=>2, :band_id=>2, :band_id_0=>2, :vocalist_id=>1, :albums_0_id=>1, :albums_0_band_id=>2},
      {:id=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>1, :albums_0_id=>2, :albums_0_band_id=>2},
      {:id=>2, :band_id=>2, :band_id_0=>2, :vocalist_id=>1, :albums_0_id=>2, :albums_0_band_id=>2}
    ]).all
    albums = [GraphAlbum.load(:id => 1, :band_id => 2), GraphAlbum.load(:id => 2, :band_id => 2)]
    a.must_equal albums
    a.map(&:band).must_equal [GraphBand.load(:id=>2, :vocalist_id=>1), GraphBand.load(:id=>2, :vocalist_id=>1)]
    a.map(&:band).map(&:albums).must_equal [albums, albums]
  end

  it "should eagerly load a many_to_one association with a custom callback" do
    ds = GraphAlbum.eager_graph(:band => proc {|ds1| ds1.select(:id).columns(:id)})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, band.id AS band_id_0 FROM albums LEFT OUTER JOIN (SELECT id FROM bands) AS band ON (band.id = albums.band_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :band_id_0=>2).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.band.must_equal GraphBand.load(:id => 2)
  end

  it "should eagerly load a one_to_one association with a custom callback" do
    ds = GraphAlbum.eager_graph(:track => proc {|ds1| ds1.select(:album_id).columns(:album_id)})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, track.album_id FROM albums LEFT OUTER JOIN (SELECT album_id FROM tracks) AS track ON (track.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.track.must_equal GraphTrack.load(:album_id=>1)
  end

  it "should eagerly load a one_to_many association with a custom callback" do
    ds = GraphAlbum.eager_graph(:tracks => proc {|ds1| ds1.select(:album_id).columns(:album_id)})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, tracks.album_id FROM albums LEFT OUTER JOIN (SELECT album_id FROM tracks) AS tracks ON (tracks.album_id = albums.id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :album_id=>1).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.tracks.must_equal [GraphTrack.load(:album_id=>1)]
  end

  it "should eagerly load a one_through_one association with a custom callback" do
    ds = GraphAlbum.eager_graph(:genre => proc {|ds1| ds1.select(:id).columns(:id)})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genre.id AS genre_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN (SELECT id FROM genres) AS genre ON (genre.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genre_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genre.must_equal GraphGenre.load(:id => 4)
  end

  it "should eagerly load a many_to_many association with a custom callback" do
    ds = GraphAlbum.eager_graph(:genres => proc {|ds1| ds1.select(:id).columns(:id)})
    ds.sql.must_equal 'SELECT albums.id, albums.band_id, genres.id AS genres_id FROM albums LEFT OUTER JOIN ag ON (ag.album_id = albums.id) LEFT OUTER JOIN (SELECT id FROM genres) AS genres ON (genres.id = ag.genre_id)'
    a = ds.with_fetch(:id=>1, :band_id=>2, :genres_id=>4).all
    a.must_equal [GraphAlbum.load(:id => 1, :band_id => 2)]
    a.first.genres.must_equal [GraphGenre.load(:id => 4)]
  end

  it "should allow cascading of eager loading with a custom callback with hash value" do
    ds = GraphTrack.eager_graph(:album=>{proc{|ds1| ds1.select(:id, :band_id).columns(:id, :band_id)}=>{:band=>:members}})
    ds.sql.must_equal 'SELECT tracks.id, tracks.album_id, album.id AS album_id_0, album.band_id, band.id AS band_id_0, band.vocalist_id, members.id AS members_id FROM tracks LEFT OUTER JOIN (SELECT id, band_id FROM albums) AS album ON (album.id = tracks.album_id) LEFT OUTER JOIN bands AS band ON (band.id = album.band_id) LEFT OUTER JOIN bm ON (bm.band_id = band.id) LEFT OUTER JOIN members ON (members.id = bm.member_id)'
    a = ds.with_fetch(:id=>3, :album_id=>1, :album_id_0=>1, :band_id=>2, :members_id=>5, :band_id_0=>2, :vocalist_id=>6).all
    a.must_equal [GraphTrack.load(:id => 3, :album_id => 1)]
    a = a.first
    a.album.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.album.band.members.must_equal [GraphBandMember.load(:id => 5)]
  end
  
  it "should allow cascading of eager loading with a custom callback with array value" do
    ds = GraphTrack.eager_graph(:album=>{proc{|ds1| ds1.select(:id, :band_id).columns(:id, :band_id)}=>[:band, :tracks]})
    ds.sql.must_equal 'SELECT tracks.id, tracks.album_id, album.id AS album_id_0, album.band_id, band.id AS band_id_0, band.vocalist_id, tracks_0.id AS tracks_0_id, tracks_0.album_id AS tracks_0_album_id FROM tracks LEFT OUTER JOIN (SELECT id, band_id FROM albums) AS album ON (album.id = tracks.album_id) LEFT OUTER JOIN bands AS band ON (band.id = album.band_id) LEFT OUTER JOIN tracks AS tracks_0 ON (tracks_0.album_id = album.id)'
    a = ds.with_fetch(:id=>3, :album_id=>1, :album_id_0=>1, :band_id=>2, :band_id_0=>2, :vocalist_id=>6, :tracks_0_id=>3, :tracks_0_album_id=>1).all
    a.must_equal [GraphTrack.load(:id => 3, :album_id => 1)]
    a = a.first
    a.album.must_equal GraphAlbum.load(:id => 1, :band_id => 2)
    a.album.band.must_equal GraphBand.load(:id => 2, :vocalist_id=>6)
    a.album.tracks.must_equal [GraphTrack.load(:id => 3, :album_id => 1)]
  end

  it "should have frozen internal data structures" do
    ds = GraphAlbum.eager_graph(:band)
    ds.opts[:eager_graph].must_be :frozen?
    ds.opts[:eager_graph].each_value{|v| v.must_be :frozen? if v.is_a?(Hash)}

    ds = ds.eager_graph(:tracks)
    ds.opts[:eager_graph].must_be :frozen?
    ds.opts[:eager_graph].each_value{|v| v.must_be :frozen? if v.is_a?(Hash)}
  end
end

describe "Sequel::Models with double underscores in table names" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :foo_id=>2})
    @Foo = Class.new(Sequel::Model(@db[Sequel.identifier(:fo__os)]))
    @Foo.columns :id, :foo_id
    @Foo.one_to_many :foos, :class=>@Foo
    @db.sqls
  end

  it "should have working eager_graph implementations" do
    @db.fetch = {:id=>1, :foo_id=>1, :foos_id=>1, :foos_foo_id=>1}
    foos = @Foo.eager_graph(:foos).all
    @db.sqls.must_equal ["SELECT fo__os.id, fo__os.foo_id, foos.id AS foos_id, foos.foo_id AS foos_foo_id FROM fo__os LEFT OUTER JOIN fo__os AS foos ON (foos._id = fo__os.id)"]
    foos.must_equal [@Foo.load(:id=>1, :foo_id=>1)]
    foos.first.foos.must_equal [@Foo.load(:id=>1, :foo_id=>1)]
  end

  it "should have working eager_graph implementations when qualified" do
    @Foo.dataset = Sequel.identifier(:fo__os).qualify(:s)
    @Foo.columns :id, :foo_id
    @db.sqls
    @db.fetch = {:id=>1, :foo_id=>1, :foos_id=>1, :foos_foo_id=>1}
    foos = @Foo.eager_graph(:foos).all
    @db.sqls.must_equal ["SELECT s.fo__os.id, s.fo__os.foo_id, foos.id AS foos_id, foos.foo_id AS foos_foo_id FROM s.fo__os LEFT OUTER JOIN s.fo__os AS foos ON (foos._id = s.fo__os.id)"]
    foos.must_equal [@Foo.load(:id=>1, :foo_id=>1)]
    foos.first.foos.must_equal [@Foo.load(:id=>1, :foo_id=>1)]
  end
end

