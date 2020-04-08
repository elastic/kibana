require_relative "spec_helper"

describe "Sequel::Plugins::JsonSerializer" do
  before do
    class ::Artist < Sequel::Model
      unrestrict_primary_key
      plugin :json_serializer, :naked=>true
      columns :id, :name
      def_column_accessor :id, :name
      @db_schema = {:id=>{:type=>:integer}}
      one_to_many :albums
    end
    class ::Album < Sequel::Model
      unrestrict_primary_key
      attr_accessor :blah
      plugin :json_serializer, :naked=>true
      columns :id, :name, :artist_id
      def_column_accessor :id, :name, :artist_id
      many_to_one :artist
    end
    @artist = Artist.load(:id=>2, :name=>'YJM')
    @artist.associations[:albums] = []
    @album = Album.load(:id=>1, :name=>'RF')
    @album.artist = @artist
    @album.blah = 'Blah'
  end
  after do
    Object.send(:remove_const, :Artist)
    Object.send(:remove_const, :Album)
  end

  it "should round trip successfully" do
    Artist.from_json(@artist.to_json).must_equal @artist
    Album.from_json(@album.to_json).must_equal @album
  end

  it "should handle ruby objects in values" do
    class ::Artist
      def name=(v)
        super(Date.parse(v))
      end
    end
    Artist.from_json(Artist.load(:name=>Date.today).to_json).must_equal Artist.load(:name=>Date.today)
  end

  it "should support setting json_serializer_opts on models" do
    @artist.json_serializer_opts(:only=>:name)
    Sequel.parse_json([@artist].to_json).must_equal [{'name'=>@artist.name}]
    @artist.json_serializer_opts(:include=>{:albums=>{:only=>:name}})
    Sequel.parse_json([@artist].to_json).must_equal [{'name'=>@artist.name, 'albums'=>[{'name'=>@album.name}]}]
  end

  it "should handle the :only option" do
    Artist.from_json(@artist.to_json(:only=>:name)).must_equal Artist.load(:name=>@artist.name)
    Album.from_json(@album.to_json(:only=>[:id, :name])).must_equal Album.load(:id=>@album.id, :name=>@album.name)
  end

  it "should handle the :except option" do
    Artist.from_json(@artist.to_json(:except=>:id)).must_equal Artist.load(:name=>@artist.name)
    Album.from_json(@album.to_json(:except=>[:id, :artist_id])).must_equal Album.load(:name=>@album.name)
  end

  it "should handle the :include option for associations" do
    Artist.from_json(@artist.to_json(:include=>:albums), :associations=>:albums).albums.must_equal [@album]
    Album.from_json(@album.to_json(:include=>:artist), :associations=>:artist).artist.must_equal @artist
  end

  it "should have #to_json support blocks for transformations" do
    values = {}
    @artist.values.each{|k,v| values[k.to_s] = v}
    Sequel.parse_json(@artist.to_json{|h| {'data'=>h}}).must_equal({'data'=>values})
  end

  it "should raise an error if attempting to parse json when providing array to non-array association or vice-versa" do
    proc{Artist.from_json('{"albums":{"id":1,"name":"RF","artist_id":2},"id":2,"name":"YJM"}', :associations=>:albums)}.must_raise(Sequel::Error)
    proc{Album.from_json('{"artist":[{"id":2,"name":"YJM"}],"id":1,"name":"RF","artist_id":2}', :associations=>:artist)}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to parse an array containing non-hashes" do
    proc{Artist.from_json('[{"id":2,"name":"YJM"}, 2]')}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to parse invalid JSON" do
    begin
      Sequel.instance_eval do
        alias pj parse_json
        def parse_json(v)
          v
        end
      end
      proc{Album.from_json('1')}.must_raise(Sequel::Error)
    ensure
      Sequel.instance_eval do
        alias parse_json pj
      end
    end
  end

  it "should handle case where Sequel.parse_json already returns an instance" do
    begin
      Sequel.instance_eval do
        alias pj parse_json
        def parse_json(v)
          Album.load(:id=>3)
        end
      end
      ::Album.from_json('1').must_equal Album.load(:id=>3)
    ensure
      Sequel.instance_eval do
        alias parse_json pj
      end
    end
  end

  it "should handle the :include option for arbitrary attributes" do
    Album.from_json(@album.to_json(:include=>:blah)).blah.must_equal @album.blah
  end

  it "should handle multiple inclusions using an array for the :include option" do
    a = Album.from_json(@album.to_json(:include=>[:blah, :artist]), :associations=>:artist)
    a.blah.must_equal @album.blah
    a.artist.must_equal @artist
  end

  it "should handle cascading using a hash for the :include option" do
    Artist.from_json(@artist.to_json(:include=>{:albums=>{:include=>:artist}}), :associations=>{:albums=>{:associations=>:artist}}).albums.map{|a| a.artist}.must_equal [@artist]
    Album.from_json(@album.to_json(:include=>{:artist=>{:include=>:albums}}), :associations=>{:artist=>{:associations=>:albums}}).artist.albums.must_equal [@album]

    Artist.from_json(@artist.to_json(:include=>{:albums=>{:only=>:name}}), :associations=>[:albums]).albums.must_equal [Album.load(:name=>@album.name)]
    Album.from_json(@album.to_json(:include=>{:artist=>{:except=>:name}}), :associations=>[:artist]).artist.must_equal Artist.load(:id=>@artist.id)

    Artist.from_json(@artist.to_json(:include=>{:albums=>{:include=>{:artist=>{:include=>:albums}}}}), :associations=>{:albums=>{:associations=>{:artist=>{:associations=>:albums}}}}).albums.map{|a| a.artist.albums}.must_equal [[@album]]
    Album.from_json(@album.to_json(:include=>{:artist=>{:include=>{:albums=>{:only=>:name}}}}), :associations=>{:artist=>{:associations=>:albums}}).artist.albums.must_equal [Album.load(:name=>@album.name)]
  end

  it "should handle usage of association_proxies when cascading using the :include option" do
    Artist.plugin :association_proxies
    Artist.one_to_many :albums, :clone=>:albums
    Artist.from_json(@artist.to_json(:include=>{:albums=>{:include=>:artist}}), :associations=>{:albums=>{:associations=>:artist}}).albums.map{|a| a.artist}.must_equal [@artist]
  end

  it "should handle the :include option cascading with an empty hash" do
    Album.from_json(@album.to_json(:include=>{:artist=>{}}), :associations=>:artist).artist.must_equal @artist
    Album.from_json(@album.to_json(:include=>{:blah=>{}})).blah.must_equal @album.blah
  end

  it "should accept a :naked option to not include the JSON.create_id, so parsing yields a plain hash" do
    Sequel.parse_json(@album.to_json(:naked=>true)).must_equal @album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}
  end

  it "should support #from_json to set column values" do
    @artist.from_json('{"name": "AS"}')
    @artist.name.must_equal 'AS'
    @artist.id.must_equal 2
  end

  it "should support #from_json to support specific :fields" do
    @album.from_json('{"name": "AS", "artist_id": 3}', :fields=>['name'])
    @album.name.must_equal 'AS'
    @album.artist_id.must_equal 2
  end

  it "should support #from_json to support :missing=>:skip option" do
    @album.from_json('{"artist_id": 3}', :fields=>['name'], :missing=>:skip)
    @album.name.must_equal 'RF'
    @album.artist_id.must_equal 2
  end

  it "should support #from_json to support :missing=>:raise option" do
    proc{@album.from_json('{"artist_id": 3}', :fields=>['name'], :missing=>:raise)}.must_raise(Sequel::Error)
  end

  it "should have #from_json raise an error if parsed json isn't a hash" do
    proc{@artist.from_json('[]')}.must_raise(Sequel::Error)
  end

  it "should raise an exception for json keys that aren't associations, columns, or setter methods" do
    Album.send(:undef_method, :blah=)
    proc{Album.from_json(@album.to_json(:include=>:blah))}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should support a to_json class and dataset method" do
    Album.dataset = Album.dataset.with_fetch(:id=>1, :name=>'RF', :artist_id=>2)
    Artist.dataset = Artist.dataset.with_fetch(:id=>2, :name=>'YJM')
    Album.array_from_json(Album.to_json).must_equal [@album]
    Album.array_from_json(Album.to_json(:include=>:artist), :associations=>:artist).map{|x| x.artist}.must_equal [@artist]
    Album.array_from_json(Album.dataset.to_json(:only=>:name)).must_equal [Album.load(:name=>@album.name)]
  end

  it "should have dataset to_json method work with eager_graph datasets" do
    ds = Album.dataset.eager_graph(:artist).with_fetch(:id=>1, :name=>'RF', :artist_id=>2, :artist_id_0=>2, :artist_name=>'YM')
    Sequel.parse_json(ds.to_json(:only=>:name, :include=>{:artist=>{:only=>:name}})).must_equal [{"name"=>"RF", "artist"=>{"name"=>"YM"}}]
  end

  it "should have dataset to_json method work with naked datasets" do
    ds = Album.dataset.naked.with_fetch(:id=>1, :name=>'RF', :artist_id=>2)
    Sequel.parse_json(ds.to_json).must_equal [@album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}]
  end

  it "should have class and dataset to_json method accept blocks for transformations" do
    Album.dataset = Album.dataset.with_fetch(:id=>1, :name=>'RF', :artist_id=>2)
    Sequel.parse_json(Album.to_json{|h| {'data'=>h}}).must_equal('data'=>[@album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}])
    Sequel.parse_json(Album.dataset.to_json{|h| {'data'=>h}}).must_equal('data'=>[@album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}])
  end

  it "should have class and dataset to_json method support :instance_block option for instance_transformations" do
    Album.dataset = Album.dataset.with_fetch(:id=>1, :name=>'RF', :artist_id=>2)
    Sequel.parse_json(Album.to_json(:instance_block=>lambda{|h| {'data'=>h}})).must_equal [{'data'=>@album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}}]
    Sequel.parse_json(Album.dataset.to_json(:instance_block=>lambda{|h| {'data'=>h}})).must_equal [{'data'=>@album.values.inject({}){|h, (k, v)| h[k.to_s] = v; h}}]
  end

  it "should have dataset to_json method respect :array option for the array to use" do
    a = Album.new(:name=>'RF', :artist_id=>3)
    Album.array_from_json(Album.to_json(:array=>[a])).must_equal [a]

    a.associations[:artist] = artist = Artist.load(:id=>3, :name=>'YJM')
    Album.array_from_json(Album.to_json(:array=>[a], :include=>:artist), :associations=>:artist).first.artist.must_equal artist

    artist.associations[:albums] = [a]
    x = Artist.array_from_json(Artist.to_json(:array=>[artist], :include=>:albums), :associations=>[:albums])
    x.must_equal [artist]
    x.first.albums.must_equal [a]
  end

  it "should propagate class default options to instance to_json output" do
    class ::Album2 < Sequel::Model
      attr_accessor :blah
      plugin :json_serializer, :naked => true, :except => :id
      columns :id, :name, :artist_id
      many_to_one :artist
    end
    @album2 = Album2.load(:id=>2, :name=>'JK')
    @album2.artist = @artist
    @album2.blah = 'Gak'
    JSON.parse(@album2.to_json).must_equal @album2.values.reject{|k,v| k.to_s == 'id'}.inject({}){|h, (k, v)| h[k.to_s] = v; h}
    JSON.parse(@album2.to_json(:only => :name)).must_equal @album2.values.reject{|k,v| k.to_s != 'name'}.inject({}){|h, (k, v)| h[k.to_s] = v; h}
    JSON.parse(@album2.to_json(:except => :artist_id)).must_equal @album2.values.reject{|k,v| k.to_s == 'artist_id'}.inject({}){|h, (k, v)| h[k.to_s] = v; h}
  end
  
  it "should handle the :root option to qualify single records" do
    @album.to_json(:root=>true, :except => [:name, :artist_id]).to_s.must_equal '{"album":{"id":1}}'
    @album.to_json(:root=>true, :only => :name).to_s.must_equal '{"album":{"name":"RF"}}'
  end

  it "should handle the :root option to qualify single records of namespaced models" do
    module ::Namespace
      class Album < Sequel::Model
        plugin :json_serializer, :naked=>true
      end
    end
    Namespace::Album.new({}).to_json(:root=>true).to_s.must_equal '{"album":{}}'
    Namespace::Album.dataset = Namespace::Album.dataset.with_fetch([{}])
    Namespace::Album.dataset.to_json(:root=>:collection).to_s.must_equal '{"albums":[{}]}'
    Namespace::Album.dataset.to_json(:root=>:both).to_s.must_equal '{"albums":[{"album":{}}]}'
    Object.send(:remove_const, :Namespace)
  end
  
  it "should handle the :root option with a string to qualify single records using the string as the key" do
    @album.to_json(:root=>"foo", :except => [:name, :artist_id]).to_s.must_equal '{"foo":{"id":1}}'
    @album.to_json(:root=>"bar", :only => :name).to_s.must_equal '{"bar":{"name":"RF"}}'
  end
  
  it "should handle the :root=>:both option to qualify a dataset of records" do
    Album.dataset.with_fetch([{:id=>1, :name=>'RF'}, {:id=>1, :name=>'RF'}]).to_json(:root=>:both, :only => :id).to_s.must_equal '{"albums":[{"album":{"id":1}},{"album":{"id":1}}]}'
  end

  it "should handle the :root=>:collection option to qualify just the collection" do
    ds = Album.dataset.with_fetch([{:id=>1, :name=>'RF'}, {:id=>1, :name=>'RF'}])
    ds.to_json(:root=>:collection, :only => :id).to_s.must_equal '{"albums":[{"id":1},{"id":1}]}'
    ds.to_json(:root=>true, :only => :id).to_s.must_equal '{"albums":[{"id":1},{"id":1}]}'
  end

  it "should handle the :root=>:instance option to qualify just the instances" do
    Album.dataset.with_fetch([{:id=>1, :name=>'RF'}, {:id=>1, :name=>'RF'}]).to_json(:root=>:instance, :only => :id).to_s.must_equal '[{"album":{"id":1}},{"album":{"id":1}}]'
  end

  it "should handle the :root=>string option to qualify just the collection using the string as the key" do
    ds = Album.dataset.with_fetch([{:id=>1, :name=>'RF'}, {:id=>1, :name=>'RF'}])
    ds.to_json(:root=>"foos", :only => :id).to_s.must_equal '{"foos":[{"id":1},{"id":1}]}'
    ds.to_json(:root=>"bars", :only => :id).to_s.must_equal '{"bars":[{"id":1},{"id":1}]}'
  end

  it "should use an alias for an included asscociation to qualify an association" do
    JSON.parse(@album.to_json(:include=>Sequel.as(:artist, :singer)).to_s).must_equal JSON.parse('{"id":1,"name":"RF","artist_id":2,"singer":{"id":2,"name":"YJM"}}')
    JSON.parse(@album.to_json(:include=>{Sequel.as(:artist, :singer)=>{:only=>:name}}).to_s).must_equal JSON.parse('{"id":1,"name":"RF","artist_id":2,"singer":{"name":"YJM"}}')
  end

  it "should store the default options in json_serializer_opts" do
    Album.json_serializer_opts.must_equal(:naked=>true)
    c = Class.new(Album)
    c.plugin :json_serializer, :naked=>false
    c.json_serializer_opts.must_equal(:naked=>false)
  end

  it "should work correctly when subclassing" do
    class ::Artist2 < Artist
      plugin :json_serializer, :only=>:name
    end
    Artist2.from_json(Artist2.load(:id=>2, :name=>'YYY').to_json).must_equal Artist2.load(:name=>'YYY')
    class ::Artist3 < Artist2
      plugin :json_serializer, :naked=>:true
    end
    Sequel.parse_json(Artist3.load(:id=>2, :name=>'YYY').to_json).must_equal("name"=>'YYY')
    Object.send(:remove_const, :Artist2)
    Object.send(:remove_const, :Artist3)
  end

  it "should raise an error if attempting to set a restricted column and :all_columns is not used" do
    Artist.restrict_primary_key
    proc{Artist.from_json(@artist.to_json)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise an error if an unsupported association is passed in the :associations option" do
    Artist.association_reflections.delete(:albums)
    proc{Artist.from_json(@artist.to_json(:include=>:albums), :associations=>:albums)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using from_json and JSON parsing returns an array" do
    proc{Artist.from_json([@artist].to_json)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using array_from_json and JSON parsing does not return an array" do
    proc{Artist.array_from_json(@artist.to_json)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using an unsupported :associations option" do
    proc{Artist.from_json(@artist.to_json, :associations=>'')}.must_raise(Sequel::Error)
  end

  it "should freeze json serializier opts when model class is frozen" do
    Album.json_serializer_opts[:only] = [:id]
    Album.freeze
    Album.json_serializer_opts.frozen?.must_equal true
    Album.json_serializer_opts[:only].frozen?.must_equal true
  end
end
