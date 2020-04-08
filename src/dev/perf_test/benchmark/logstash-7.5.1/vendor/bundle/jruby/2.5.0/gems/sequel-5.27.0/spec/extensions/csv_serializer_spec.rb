require_relative "spec_helper"

require 'csv' 

describe "Sequel::Plugins::CsvSerializer" do
  before do
    artist = @Artist = Class.new(Sequel::Model(:artists))
    @Artist.class_eval do
      def self.name; 'Artist' end
      unrestrict_primary_key
      plugin :csv_serializer
      columns :id, :name
      def_column_accessor :id, :name
      @db_schema = {:id=>{:type=>:integer}}
    end
    @Album = Class.new(Sequel::Model(:albums))
    @Album.class_eval do
      def self.name; 'Album' end
      unrestrict_primary_key
      attr_accessor :blah
      plugin :csv_serializer
      columns :id, :name, :artist_id
      def_column_accessor :id, :name, :artist_id
      @db_schema = {:id=>{:type=>:integer}, :artist_id=>{:type=>:integer}}
      many_to_one :artist, :class=>artist
    end
    @artist = @Artist.load(:id=>2, :name=>'YJM')
    @artist.associations[:albums] = []
    @album = @Album.load(:id=>1, :name=>'RF')
    @album.artist = @artist
    @album.blah = 'Blah'
  end

  it "should round trip successfully" do
    @Artist.from_csv(@artist.to_csv).must_equal @artist
    @Album.from_csv(@album.to_csv).must_equal @album
  end

  it "should handle ruby objects in values" do
    @Artist.send(:define_method, :name=) do |v|
      super(Date.parse(v))
    end
    a = @Artist.load(:name=>Date.today)
    opts = {:columns=>[:name]}
    @Artist.from_csv(a.to_csv(opts), opts).must_equal a
  end

  it "should handle the :only option" do
    @Artist.from_csv(@artist.to_csv(:only=>:name), :only=>:name).must_equal @Artist.load(:name=>@artist.name)
    @Album.from_csv(@album.to_csv(:only=>[:id, :name]), :only=>[:id, :name]).must_equal @Album.load(:id=>@album.id, :name=>@album.name)
  end

  it "should handle the :except option" do
    @Artist.from_csv(@artist.to_csv(:except=>:id), :except=>:id).must_equal @Artist.load(:name=>@artist.name)
    @Album.from_csv(@album.to_csv(:except=>[:id, :artist_id]), :except=>[:id, :artist_id]).must_equal @Album.load(:name=>@album.name)
  end

  it "should handle the :include option for arbitrary attributes" do
    @Album.from_csv(@album.to_csv(:include=>:blah), :include=>:blah).blah.must_equal @album.blah
  end

  it "should handle multiple inclusions using an array for the :include option" do
    a = @Album.from_csv(@album.to_csv(:include=>[:blah]), :include=>:blah)
    a.blah.must_equal @album.blah
  end

  it "#from_csv should set column values" do
    @artist.from_csv('AS', :only=>:name)
    @artist.name.must_equal 'AS'
    @artist.id.must_equal 2

    @artist.from_csv('1', :only=>:id)
    @artist.name.must_equal 'AS'
    @artist.id.must_equal 1
  end

  it ".array_from_csv should support :headers to specify headers" do
    @albums = @Album.array_from_csv("AS,2\nDF,3", :headers=>['name', 'artist_id'])
    @albums.map(&:name).must_equal %w'AS DF'
    @albums.map(&:artist_id).must_equal [2, 3]

    @albums = @Album.array_from_csv("2,AS\n3,DF", :headers=>[nil, 'name'])
    @albums.map(&:name).must_equal %w'AS DF'
    @albums.map(&:artist_id).must_equal [nil, nil]
  end

  it ".from_csv should support :headers to specify headers" do
    @album = @Album.from_csv('AS,2', :headers=>['name', 'artist_id'])
    @album.name.must_equal 'AS'
    @album.artist_id.must_equal 2

    @album = @Album.from_csv('2,AS', :headers=>[nil, 'name'])
    @album.name.must_equal 'AS'
    @album.artist_id.must_be_nil
  end

  it "#from_csv should support :headers to specify headers" do
    @album.from_csv('AS,2', :headers=>['name'])
    @album.name.must_equal 'AS'
    @album.artist_id.must_equal 2

    @album.from_csv('2,AS', :headers=>[nil, 'name'])
    @album.name.must_equal 'AS'
    @album.artist_id.must_equal 2
  end

  it "should support a to_csv class and dataset method" do
    @Album.dataset = @Album.dataset.with_fetch(:id=>1, :name=>'RF', :artist_id=>2)
    @Artist.dataset = @Artist.dataset.with_fetch(:id=>2, :name=>'YJM')
    @Album.columns(:id, :name, :artist_id)
    @Album.db_schema.replace(:id=>{:type=>:integer}, :artist_id=>{:type=>:integer})
    @Album.array_from_csv(@Album.to_csv).must_equal [@album]
    @Album.array_from_csv(@Album.dataset.to_csv(:only=>:name), :only=>:name).must_equal [@Album.load(:name=>@album.name)]
  end

  it "should have dataset to_csv method respect :array option" do
    a = @Album.new(:id=>1, :name=>'RF', :artist_id=>3)
    @Album.array_from_csv(@Album.to_csv(:array=>[a])).must_equal [a]
  end

  it "#to_csv should respect class options" do
    @Album = Class.new(Sequel::Model(:albums))
    artist = @Artist
    @Album.class_eval do
      attr_accessor :blah
      plugin :csv_serializer, :except => :id, :write_headers=>true, :include=>:blah
      columns :id, :name, :artist_id
      many_to_one :artist, :class=>artist
    end
    @album = @Album.load(:id=>2, :name=>'JK')
    @album.artist = @artist
    @album.blah = 'Gak'

    @album.to_csv.must_equal "name,artist_id,blah\nJK,2,Gak\n"
    @album.to_csv(:write_headers=>false).must_equal "JK,2,Gak\n"
    @album.to_csv(:headers=>[:name]).must_equal "name\nJK\n"
    @album.to_csv(:headers=>[:name, :id]).must_equal "name,id\nJK,2\n"
    @album.to_csv(:only=>[:name]).must_equal "name,blah\nJK,Gak\n"
    @album.to_csv(:except=>nil).must_equal "id,name,artist_id,blah\n2,JK,2,Gak\n"
    @album.to_csv(:except=>[:blah]).must_equal "id,name,artist_id\n2,JK,2\n"
  end

  it "should store the default options in csv_serializer_opts" do
    @Album.csv_serializer_opts.must_equal({})
    c = Class.new(@Album)
    @Album.csv_serializer_opts[:include] = :blah
    c.plugin :csv_serializer, :naked=>false
    c.csv_serializer_opts.must_equal(:naked=>false)
    @Album.csv_serializer_opts.must_equal(:include=>:blah)
  end

  it "should work correctly when subclassing" do
    @Artist2 = Class.new(@Artist)
    @Artist2.plugin :csv_serializer, :only=>:name
    @Artist3 = Class.new(@Artist2)
    @Artist3.from_csv(@Artist3.load(:id=>2, :name=>'YYY').to_csv).must_equal @Artist3.load(:name=>'YYY')
  end

  it "should raise an error if attempting to set a restricted column and :all_columns is not used" do
    @Artist.restrict_primary_key
    proc{@Artist.from_csv(@artist.to_csv)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should use a dataset's selected columns" do
    columns = [:id]
    ds = @Artist.select(*columns).limit(1)
    ds.send(:columns=, columns)
    ds.with_fetch(:id => 10).to_csv(:write_headers => true).must_equal "id\n10\n"
  end

  it "should pass all the examples from the documentation" do
    @album.to_csv(:write_headers=>true).must_equal "id,name,artist_id\n1,RF,2\n"
    @album.to_csv(:only=>:name).must_equal "RF\n"
    @album.to_csv(:except=>[:id, :artist_id]).must_equal "RF\n"
  end

  it "should freeze csv serializier opts when model class is frozen" do
    @Album.csv_serializer_opts[:only] = [:id]
    @Album.freeze
    @Album.csv_serializer_opts.frozen?.must_equal true
    @Album.csv_serializer_opts[:only].frozen?.must_equal true
  end
end
