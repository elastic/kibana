require_relative "spec_helper"

begin
  require 'nokogiri'
rescue LoadError
  warn "Skipping test of xml_serializer plugin: can't load nokogiri"
else
describe "Sequel::Plugins::XmlSerializer" do
  before do
    class ::Artist < Sequel::Model
      unrestrict_primary_key
      plugin :xml_serializer
      columns :id, :name
      @db_schema = {:id=>{:type=>:integer}, :name=>{:type=>:string}}
      one_to_many :albums
    end
    class ::Album < Sequel::Model
      unrestrict_primary_key
      attr_accessor :blah
      plugin :xml_serializer
      columns :id, :name, :artist_id
      @db_schema2 = @db_schema = {:id=>{:type=>:integer}, :name=>{:type=>:string}, :artist_id=>{:type=>:integer}}
      def self.set_dataset(*)
        super
        @db_schema = @db_schema2
      end
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
    Artist.from_xml(@artist.to_xml).must_equal @artist
    Album.from_xml(@album.to_xml).must_equal @album
  end

  it "should round trip successfully for namespaced models" do
    module XmlSerializerTest
      class Artist < Sequel::Model
        unrestrict_primary_key
        plugin :xml_serializer
        columns :id, :name
        @db_schema = {:id=>{:type=>:integer}, :name=>{:type=>:string}}
      end 
    end
    artist = XmlSerializerTest::Artist.load(:id=>2, :name=>'YJM')
    XmlSerializerTest::Artist.from_xml(artist.to_xml).must_equal artist
  end

  it "should round trip successfully with empty strings" do
    artist = Artist.load(:id=>2, :name=>'')
    Artist.from_xml(artist.to_xml).must_equal artist
  end

  it "should round trip successfully with nil values" do
    artist = Artist.load(:id=>2, :name=>nil)
    Artist.from_xml(artist.to_xml).must_equal artist
  end

  it "should handle the :only option" do
    Artist.from_xml(@artist.to_xml(:only=>:name)).must_equal Artist.load(:name=>@artist.name)
    Album.from_xml(@album.to_xml(:only=>[:id, :name])).must_equal Album.load(:id=>@album.id, :name=>@album.name)
  end

  it "should handle the :except option" do
    Artist.from_xml(@artist.to_xml(:except=>:id)).must_equal Artist.load(:name=>@artist.name)
    Album.from_xml(@album.to_xml(:except=>[:id, :artist_id])).must_equal Album.load(:name=>@album.name)
  end

  it "should handle the :include option for associations" do
    Artist.from_xml(@artist.to_xml(:include=>:albums), :associations=>:albums).albums.must_equal [@album]
    Album.from_xml(@album.to_xml(:include=>:artist), :associations=>:artist).artist.must_equal @artist
  end

  it "should handle the :include option for arbitrary attributes" do
    Album.from_xml(@album.to_xml(:include=>:blah)).blah.must_equal @album.blah
  end

  it "should handle multiple inclusions using an array for the :include option" do
    a = Album.from_xml(@album.to_xml(:include=>[:blah, :artist]), :associations=>:artist)
    a.blah.must_equal @album.blah
    a.artist.must_equal @artist
  end

  it "should handle cascading using a hash for the :include option" do
    Artist.from_xml(@artist.to_xml(:include=>{:albums=>{:include=>:artist}}), :associations=>{:albums=>{:associations=>:artist}}).albums.map{|a| a.artist}.must_equal [@artist]
    Album.from_xml(@album.to_xml(:include=>{:artist=>{:include=>:albums}}), :associations=>{:artist=>{:associations=>:albums}}).artist.albums.must_equal [@album]

    Artist.from_xml(@artist.to_xml(:include=>{:albums=>{:only=>:name}}), :associations=>{:albums=>{:fields=>%w'name'}}).albums.must_equal [Album.load(:name=>@album.name)]
    Album.from_xml(@album.to_xml(:include=>{:artist=>{:except=>:name}}), :associations=>:artist).artist.must_equal Artist.load(:id=>@artist.id)

    Artist.from_xml(@artist.to_xml(:include=>{:albums=>{:include=>{:artist=>{:include=>:albums}}}}), :associations=>{:albums=>{:associations=>{:artist=>{:associations=>:albums}}}}).albums.map{|a| a.artist.albums}.must_equal [[@album]]
    Album.from_xml(@album.to_xml(:include=>{:artist=>{:include=>{:albums=>{:only=>:name}}}}), :associations=>{:artist=>{:associations=>{:albums=>{:fields=>%w'name'}}}}).artist.albums.must_equal [Album.load(:name=>@album.name)]
  end

  it "should handle the :include option cascading with an empty hash" do
    Album.from_xml(@album.to_xml(:include=>{:artist=>{}}), :associations=>:artist).artist.must_equal @artist
    Album.from_xml(@album.to_xml(:include=>{:blah=>{}})).blah.must_equal @album.blah
  end

  it "should support #from_xml to set column values" do
    @artist.from_xml('<album><name>AS</name></album>')
    @artist.name.must_equal 'AS'
    @artist.id.must_equal 2
  end

  it "should support a :name_proc option when serializing and deserializing" do
    Album.from_xml(@album.to_xml(:name_proc=>proc{|s| s.reverse}), :name_proc=>proc{|s| s.reverse}).must_equal @album
  end

  it "should support a :camelize option when serializing and :underscore option when deserializing" do
    Album.from_xml(@album.to_xml(:camelize=>true), :underscore=>true).must_equal @album
  end

  it "should support a :camelize option when serializing and :underscore option when deserializing" do
    Album.from_xml(@album.to_xml(:dasherize=>true), :underscore=>true).must_equal @album
  end

  it "should support an :encoding option when serializing" do
     @artist.to_xml(:encoding=>'UTF-8').gsub(/\n */m, '').must_equal "<?xml version=\"1.0\" encoding=\"UTF-8\"?><artist><id>2</id><name>YJM</name></artist>"
  end

  it "should support a :builder_opts option when serializing" do
    @artist.to_xml(:builder_opts=>{:encoding=>'UTF-8'}).gsub(/\n */m, '').must_equal "<?xml version=\"1.0\" encoding=\"UTF-8\"?><artist><id>2</id><name>YJM</name></artist>"
  end

  it "should support an :types option when serializing" do
    @artist.to_xml(:types=>true).gsub(/\n */m, '').must_equal "<?xml version=\"1.0\"?><artist><id type=\"integer\">2</id><name type=\"string\">YJM</name></artist>"
  end

  it "should support an :root_name option when serializing" do
    @artist.to_xml(:root_name=>'ar').gsub(/\n */m, '').must_equal "<?xml version=\"1.0\"?><ar><id>2</id><name>YJM</name></ar>"
  end

  it "should support an :array_root_name option when serializing arrays" do
    artist = @artist
    Artist.dataset = Artist.dataset.with_extend{define_method(:all){[artist]}}
    Artist.to_xml(:array_root_name=>'ars', :root_name=>'ar').gsub(/\n */m, '').must_equal "<?xml version=\"1.0\"?><ars><ar><id>2</id><name>YJM</name></ar></ars>"
  end

  it "should raise an exception for xml tags that aren't associations, columns, or setter methods" do
    Album.send(:undef_method, :blah=)
    proc{Album.from_xml(@album.to_xml(:include=>:blah))}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should support a to_xml class and dataset method" do
    album = @album
    Album.dataset = Album.dataset.with_extend{define_method(:all){[album]}}
    Album.array_from_xml(Album.to_xml).must_equal [@album]
    Album.array_from_xml(Album.to_xml(:include=>:artist), :associations=>:artist).map{|x| x.artist}.must_equal [@artist]
    Album.array_from_xml(Album.dataset.to_xml(:only=>:name)).must_equal [Album.load(:name=>@album.name)]
  end

  it "should have to_xml dataset method respect an :array option" do
    a = Album.load(:id=>1, :name=>'RF', :artist_id=>3)
    Album.array_from_xml(Album.to_xml(:array=>[a])).must_equal [a]

    a.associations[:artist] = artist = Artist.load(:id=>3, :name=>'YJM')
    Album.array_from_xml(Album.to_xml(:array=>[a], :include=>:artist), :associations=>:artist).first.artist.must_equal artist

    artist.associations[:albums] = [a]
    x = Artist.array_from_xml(Artist.to_xml(:array=>[artist], :include=>:albums), :associations=>[:albums])
    x.must_equal [artist]
    x.first.albums.must_equal [a]
  end

  it "should work correctly for eager graphed datasets" do
    ds = Album.dataset.eager_graph(:artist).with_fetch(:id=>1, :name=>'RF', :artist_id=>2, :artist_id_0=>2, :artist_name=>'YJM')
    albums = Album.array_from_xml(ds.to_xml(:only=>:name, :include=>{:artist=>{:only=>:name}}), :associations=>:artist)
    albums.must_equal [Album.load(:name=>@album.name)]
    albums.first.artist.must_equal Artist.load(:name=>@artist.name)
  end

  it "should raise an error if the dataset does not have a row_proc" do
    proc{Album.dataset.naked.to_xml}.must_raise(Sequel::Error)
  end

  it "should raise an error if using parsing empty xml" do
    proc{Artist.from_xml("<?xml version=\"1.0\"?>\n")}.must_raise(Sequel::Error)
    proc{Artist.array_from_xml("<?xml version=\"1.0\"?>\n")}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to set a restricted column and :all_columns is not used" do
    Artist.restrict_primary_key
    proc{Artist.from_xml(@artist.to_xml)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise an error if an unsupported association is passed in the :associations option" do
    Artist.association_reflections.delete(:albums)
    proc{Artist.from_xml(@artist.to_xml(:include=>:albums), :associations=>:albums)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using from_xml and XML represents an array" do
    proc{Artist.from_xml(Artist.to_xml(:array=>[@artist]))}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise an error if using array_from_xml and XML does not represent an array" do
    proc{Artist.array_from_xml(@artist.to_xml)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using an unsupported :associations option" do
    proc{Artist.from_xml(@artist.to_xml, :associations=>'')}.must_raise(Sequel::Error)
  end
end
end
