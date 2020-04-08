require_relative "spec_helper"

describe "Sequel::Plugins::AssociationPks" do
  before do
    @db = Sequel.mock(:autoid=>1, :fetch=>proc do |sql|
      case sql
      when /SELECT \* FROM (?:artists|albums) WHERE \(id = (\d+)\) LIMIT 1/
        {:id=>$1.to_i}
      when "SELECT id FROM albums WHERE (albums.artist_id = 1)"
        [{:id=>1}, {:id=>2}, {:id=>3}]
      when /SELECT tag_id FROM albums_tags WHERE \(album_id = (\d)\)/,
           /SELECT tags.id FROM tags INNER JOIN albums_tags ON \(albums_tags.tag_id = tags.id\) WHERE \(albums_tags.album_id = (\d)\)/
        a = []
        a << {:tag_id=>1} if $1 == '1'
        a << {:tag_id=>2} if $1 != '3'
        a << {:tag_id=>3} if $1 == '2'
        a
      when "SELECT first, last FROM vocalists WHERE (vocalists.album_id = 1)"
        [{:first=>"F1", :last=>"L1"}, {:first=>"F2", :last=>"L2"}]
      when /SELECT first, last FROM albums_vocalists WHERE \(album_id = (\d)\)/
        a = []
        a << {:first=>"F1", :last=>"L1"} if $1 == '1'
        a << {:first=>"F2", :last=>"L2"} if $1 != '3'
        a << {:first=>"F3", :last=>"L3"} if $1 == '2'
        a
      when "SELECT id FROM instruments WHERE ((instruments.first = 'F1') AND (instruments.last = 'L1'))"
        [{:id=>1}, {:id=>2}]
      when /SELECT instrument_id FROM vocalists_instruments WHERE \(\((?:first|last) = '?[FL1](\d)/
        a = []
        a << {:instrument_id=>1} if $1 == "1"
        a << {:instrument_id=>2} if $1 != "3"
        a << {:instrument_id=>3} if $1 == "2"
        a
      when "SELECT year, week FROM hits WHERE ((hits.first = 'F1') AND (hits.last = 'L1'))"
        [{:year=>1997, :week=>1}, {:year=>1997, :week=>2}]
      when /SELECT year, week FROM vocalists_hits WHERE \(\((?:first|last) = '?[FL1](\d)/,
           /SELECT hits.year, hits.week FROM hits INNER JOIN vocalists_hits ON \(\(vocalists_hits.(?:year|week) = hits.(?:year|week)\) AND \(vocalists_hits.(?:year|week) = hits.(?:year|week)\)\) WHERE \(\(vocalists_hits.(?:first|last) = '?[FL1](\d)/
        a = []
        a << {:year=>1997, :week=>1} if $1 == "1"
        a << {:year=>1997, :week=>2} if $1 != "3"
        a << {:year=>1997, :week=>3} if $1 == "2"
        a
      end
    end)
    @Artist = Class.new(Sequel::Model(@db[:artists]))
    @Artist.columns :id
    @Album = Class.new(Sequel::Model(@db[:albums]))
    @Album.columns :id, :artist_id
    @Tag = Class.new(Sequel::Model(@db[:tags]))
    @Tag.columns :id
    @Vocalist = Class.new(Sequel::Model(@db[:vocalists]))
    @Vocalist.columns :first, :last, :album_id
    @Vocalist.set_primary_key [:first, :last]
    @Instrument = Class.new(Sequel::Model(@db[:instruments]))
    @Instrument.columns :id, :first, :last
    @Hit = Class.new(Sequel::Model(@db[:hits]))
    @Hit.columns :year, :week, :first, :last
    @Hit.set_primary_key [:year, :week]
    @Artist.plugin :association_pks
    @Album.plugin :association_pks
    @Vocalist.plugin :association_pks
    @Artist.one_to_many :albums, :class=>@Album, :key=>:artist_id, :delay_pks=>false
    @Album.many_to_many :tags, :class=>@Tag, :join_table=>:albums_tags, :left_key=>:album_id, :delay_pks=>false
    @db.sqls
  end

  it "should return correct associated pks for one_to_many associations" do
    @Artist.load(:id=>1).album_pks.must_equal [1,2,3]
    @db.sqls.must_equal ["SELECT id FROM albums WHERE (albums.artist_id = 1)"]
    @Artist.load(:id=>2).album_pks.must_equal []
    @db.sqls.must_equal ["SELECT id FROM albums WHERE (albums.artist_id = 2)"]
  end

  it "should return correct associated pks for many_to_many associations" do
    @Album.load(:id=>1).tag_pks.must_equal [1, 2]
    @db.sqls.must_equal ["SELECT tag_id FROM albums_tags WHERE (album_id = 1)"]
    @Album.load(:id=>2).tag_pks.must_equal [2, 3]
    @db.sqls.must_equal ["SELECT tag_id FROM albums_tags WHERE (album_id = 2)"]
    @Album.load(:id=>3).tag_pks.must_equal []
    @db.sqls.must_equal ["SELECT tag_id FROM albums_tags WHERE (album_id = 3)"]
  end

  it "should return correct associated pks for many_to_many associations using :association_pks_use_associated_table" do
    @Album.many_to_many :tags, :class=>@Tag, :join_table=>:albums_tags, :left_key=>:album_id, :delay_pks=>false, :association_pks_use_associated_table=>true
    @Album.load(:id=>1).tag_pks.must_equal [1, 2]
    @db.sqls.must_equal ["SELECT tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (albums_tags.album_id = 1)"]
    @Album.load(:id=>2).tag_pks.must_equal [2, 3]
    @db.sqls.must_equal ["SELECT tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (albums_tags.album_id = 2)"]
    @Album.load(:id=>3).tag_pks.must_equal []
    @db.sqls.must_equal ["SELECT tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (albums_tags.album_id = 3)"]
  end

  it "should set associated pks correctly for a one_to_many association" do
    @Artist.load(:id=>1).album_pks = [1, 2]
    @db.sqls.must_equal ["UPDATE albums SET artist_id = 1 WHERE (id IN (1, 2))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN (1, 2)))"]
  end

  it "should use associated class's primary key for a one_to_many association" do
    @Album.set_primary_key :foo
    @Artist.load(:id=>1).album_pks = [1, 2]
    @db.sqls.must_equal ["UPDATE albums SET artist_id = 1 WHERE (foo IN (1, 2))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (foo NOT IN (1, 2)))"]
  end

  it "should set associated pks correctly for a many_to_many association" do
    @Album.load(:id=>2).tag_pks = [1, 3]
    @db.sqls.must_equal ["DELETE FROM albums_tags WHERE ((album_id = 2) AND (tag_id NOT IN (1, 3)))",
      'SELECT tag_id FROM albums_tags WHERE (album_id = 2)',
      'BEGIN',
      'INSERT INTO albums_tags (album_id, tag_id) VALUES (2, 1)',
      'COMMIT']
  end

  it "should return correct right-side associated cpks for one_to_many associations" do
    @Album.one_to_many :vocalists, :class=>@Vocalist, :key=>:album_id
    @Album.load(:id=>1).vocalist_pks.must_equal [["F1", "L1"], ["F2", "L2"]]
    @Album.load(:id=>2).vocalist_pks.must_equal []
  end

  it "should return correct right-side associated cpks for many_to_many associations" do
    @Album.many_to_many :vocalists, :class=>@Vocalist, :join_table=>:albums_vocalists, :left_key=>:album_id, :right_key=>[:first, :last]
    @Album.load(:id=>1).vocalist_pks.must_equal [["F1", "L1"], ["F2", "L2"]]
    @Album.load(:id=>2).vocalist_pks.must_equal [["F2", "L2"], ["F3", "L3"]]
    @Album.load(:id=>3).vocalist_pks.must_equal []
  end

  it "should set associated right-side cpks correctly for a one_to_many association" do
    @Album.one_to_many :vocalists, :class=>@Vocalist, :key=>:album_id, :delay_pks=>false
    @Album.load(:id=>1).vocalist_pks = [["F1", "L1"], ["F2", "L2"]]
    @db.sqls.must_equal ["UPDATE vocalists SET album_id = 1 WHERE ((first, last) IN (('F1', 'L1'), ('F2', 'L2')))",
      "UPDATE vocalists SET album_id = NULL WHERE ((vocalists.album_id = 1) AND ((first, last) NOT IN (('F1', 'L1'), ('F2', 'L2'))))"]
  end

  it "should set associated right-side cpks correctly for a many_to_many association" do
    @Album.many_to_many :vocalists, :class=>@Vocalist, :join_table=>:albums_vocalists, :left_key=>:album_id, :right_key=>[:first, :last], :delay_pks=>false
    @Album.load(:id=>2).vocalist_pks = [["F1", "L1"], ["F2", "L2"]]
    sqls = @db.sqls
    sqls[0].must_equal "DELETE FROM albums_vocalists WHERE ((album_id = 2) AND ((first, last) NOT IN (('F1', 'L1'), ('F2', 'L2'))))"
    sqls[1].must_equal 'SELECT first, last FROM albums_vocalists WHERE (album_id = 2)'
    match = sqls[3].match(/INSERT INTO albums_vocalists \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"'F1'", "last"=>"'L1'", "album_id"=>"2")
    sqls.length.must_equal 5
  end

  it "should return correct associated pks for left-side cpks for one_to_many associations" do
    @Vocalist.one_to_many :instruments, :class=>@Instrument, :key=>[:first, :last]
    @Vocalist.load(:first=>'F1', :last=>'L1').instrument_pks.must_equal [1, 2]
    @Vocalist.load(:first=>'F2', :last=>'L2').instrument_pks.must_equal []
  end

  it "should return correct associated pks for left-side cpks for many_to_many associations" do
    @Vocalist.many_to_many :instruments, :class=>@Instrument, :join_table=>:vocalists_instruments, :left_key=>[:first, :last]
    @Vocalist.load(:first=>'F1', :last=>'L1').instrument_pks.must_equal [1, 2]
    @Vocalist.load(:first=>'F2', :last=>'L2').instrument_pks.must_equal [2, 3]
    @Vocalist.load(:first=>'F3', :last=>'L3').instrument_pks.must_equal []
  end

  it "should set associated pks correctly for left-side cpks for a one_to_many association" do
    @Vocalist.one_to_many :instruments, :class=>@Instrument, :key=>[:first, :last], :delay_pks=>false
    @Vocalist.load(:first=>'F1', :last=>'L1').instrument_pks = [1, 2]
    @db.sqls.must_equal ["UPDATE instruments SET first = 'F1', last = 'L1' WHERE (id IN (1, 2))",
      "UPDATE instruments SET first = NULL, last = NULL WHERE ((instruments.first = 'F1') AND (instruments.last = 'L1') AND (id NOT IN (1, 2)))"]
  end

  it "should set associated pks correctly for left-side cpks for a many_to_many association" do
    @Vocalist.many_to_many :instruments, :class=>@Instrument, :join_table=>:vocalists_instruments, :left_key=>[:first, :last], :delay_pks=>false
    @Vocalist.load(:first=>'F2', :last=>'L2').instrument_pks = [1, 2]
    sqls = @db.sqls
    sqls[0].must_equal "DELETE FROM vocalists_instruments WHERE ((first = 'F2') AND (last = 'L2') AND (instrument_id NOT IN (1, 2)))"
    sqls[1].must_equal "SELECT instrument_id FROM vocalists_instruments WHERE ((first = 'F2') AND (last = 'L2'))"
    match = sqls[3].match(/INSERT INTO vocalists_instruments \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"'F2'", "last"=>"'L2'", "instrument_id"=>"1")
    sqls.length.must_equal 5
  end

  it "should return correct right-side associated cpks for left-side cpks for one_to_many associations" do
    @Vocalist.one_to_many :hits, :class=>@Hit, :key=>[:first, :last]
    @Vocalist.load(:first=>'F1', :last=>'L1').hit_pks.must_equal [[1997, 1], [1997, 2]]
    @db.sqls.must_equal ["SELECT year, week FROM hits WHERE ((hits.first = 'F1') AND (hits.last = 'L1'))"]
    @Vocalist.load(:first=>'F2', :last=>'L2').hit_pks.must_equal []
    @db.sqls.must_equal ["SELECT year, week FROM hits WHERE ((hits.first = 'F2') AND (hits.last = 'L2'))"]
  end

  it "should return correct right-side associated cpks for left-side cpks for many_to_many associations" do
    @Vocalist.many_to_many :hits, :class=>@Hit, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week]
    @Vocalist.load(:first=>'F1', :last=>'L1').hit_pks.must_equal [[1997, 1], [1997, 2]]
    @db.sqls.must_equal ["SELECT year, week FROM vocalists_hits WHERE ((first = 'F1') AND (last = 'L1'))"]
    @Vocalist.load(:first=>'F2', :last=>'L2').hit_pks.must_equal [[1997, 2], [1997, 3]]
    @db.sqls.must_equal ["SELECT year, week FROM vocalists_hits WHERE ((first = 'F2') AND (last = 'L2'))"]
    @Vocalist.load(:first=>'F3', :last=>'L3').hit_pks.must_equal []
    @db.sqls.must_equal ["SELECT year, week FROM vocalists_hits WHERE ((first = 'F3') AND (last = 'L3'))"]
  end

  it "should return correct right-side associated cpks for left-side cpks for many_to_many associations when using :association_pks_use_associated_table" do
    @Vocalist.many_to_many :hits, :class=>@Hit, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :association_pks_use_associated_table=>true
    @Vocalist.load(:first=>'F1', :last=>'L1').hit_pks.must_equal [[1997, 1], [1997, 2]]
    @db.sqls.must_equal ["SELECT hits.year, hits.week FROM hits INNER JOIN vocalists_hits ON ((vocalists_hits.year = hits.year) AND (vocalists_hits.week = hits.week)) WHERE ((vocalists_hits.first = 'F1') AND (vocalists_hits.last = 'L1'))"]
    @Vocalist.load(:first=>'F2', :last=>'L2').hit_pks.must_equal [[1997, 2], [1997, 3]]
    @db.sqls.must_equal ["SELECT hits.year, hits.week FROM hits INNER JOIN vocalists_hits ON ((vocalists_hits.year = hits.year) AND (vocalists_hits.week = hits.week)) WHERE ((vocalists_hits.first = 'F2') AND (vocalists_hits.last = 'L2'))"]
    @Vocalist.load(:first=>'F3', :last=>'L3').hit_pks.must_equal []
    @db.sqls.must_equal ["SELECT hits.year, hits.week FROM hits INNER JOIN vocalists_hits ON ((vocalists_hits.year = hits.year) AND (vocalists_hits.week = hits.week)) WHERE ((vocalists_hits.first = 'F3') AND (vocalists_hits.last = 'L3'))"]
  end

  it "should set associated right-side cpks correctly for left-side cpks for a one_to_many association" do
    @Vocalist.one_to_many :hits, :class=>@Hit, :key=>[:first, :last], :order=>:week, :delay_pks=>false
    @Vocalist.load(:first=>'F1', :last=>'L1').hit_pks = [[1997, 1], [1997, 2]]
    @db.sqls.must_equal ["UPDATE hits SET first = 'F1', last = 'L1' WHERE ((year, week) IN ((1997, 1), (1997, 2)))",
      "UPDATE hits SET first = NULL, last = NULL WHERE ((hits.first = 'F1') AND (hits.last = 'L1') AND ((year, week) NOT IN ((1997, 1), (1997, 2))))"]
  end

  it "should set associated right-side cpks correctly for left-side cpks for a many_to_many association" do
    @Vocalist.many_to_many :hits, :class=>@Hit, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :delay_pks=>false
    @Vocalist.load(:first=>'F2', :last=>'L2').hit_pks = [[1997, 1], [1997, 2]]
    sqls = @db.sqls
    sqls[0].must_equal "DELETE FROM vocalists_hits WHERE ((first = 'F2') AND (last = 'L2') AND ((year, week) NOT IN ((1997, 1), (1997, 2))))"
    sqls[1].must_equal "SELECT year, week FROM vocalists_hits WHERE ((first = 'F2') AND (last = 'L2'))"
    match = sqls[3].match(/INSERT INTO vocalists_hits \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"'F2'", "last"=>"'L2'", "year"=>"1997", "week"=>"1")
    sqls.length.must_equal 5
  end

  it "should use transactions if the object is configured to use transactions" do
    artist = @Artist.load(:id=>1)
    artist.use_transactions = true
    artist.album_pks = [1, 2]
    @db.sqls.must_equal ["BEGIN",
      "UPDATE albums SET artist_id = 1 WHERE (id IN (1, 2))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN (1, 2)))",
      "COMMIT"]

    album = @Album.load(:id=>2)
    album.use_transactions = true
    album.tag_pks = [1, 3]
    @db.sqls.must_equal ["BEGIN",
      "DELETE FROM albums_tags WHERE ((album_id = 2) AND (tag_id NOT IN (1, 3)))",
      'SELECT tag_id FROM albums_tags WHERE (album_id = 2)',
      'INSERT INTO albums_tags (album_id, tag_id) VALUES (2, 1)',
      "COMMIT"]
  end

  it "should automatically convert keys to numbers if the primary key is an integer for one_to_many associations" do
    @Album.db_schema[:id][:type] = :integer
    @Artist.load(:id=>1).album_pks = %w'1 2'
    @db.sqls.must_equal ["UPDATE albums SET artist_id = 1 WHERE (id IN (1, 2))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN (1, 2)))"]
  end

  it "should not automatically convert keys if the primary key is not an integer for one_to_many associations" do
    @Album.db_schema[:id][:type] = :string
    @Artist.load(:id=>1).album_pks = %w'1 2'
    @db.sqls.must_equal ["UPDATE albums SET artist_id = 1 WHERE (id IN ('1', '2'))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN ('1', '2')))"]
  end

  it "should automatically convert keys to numbers if the primary key is an integer for many_to_many associations" do
    @Tag.db_schema[:id][:type] = :integer
    @Album.load(:id=>2).tag_pks = %w'1 3'
    @db.sqls.must_equal ["DELETE FROM albums_tags WHERE ((album_id = 2) AND (tag_id NOT IN (1, 3)))",
      'SELECT tag_id FROM albums_tags WHERE (album_id = 2)',
      'BEGIN',
      'INSERT INTO albums_tags (album_id, tag_id) VALUES (2, 1)',
      'COMMIT']
  end

  it "should not automatically convert keys to numbers if the primary key is an integer for many_to_many associations" do
    @Tag.db_schema[:id][:type] = :string
    @Album.load(:id=>2).tag_pks = %w'1 3'
    @db.sqls.must_equal [
      "DELETE FROM albums_tags WHERE ((album_id = 2) AND (tag_id NOT IN ('1', '3')))",
      'SELECT tag_id FROM albums_tags WHERE (album_id = 2)',
      'BEGIN',
      "INSERT INTO albums_tags (album_id, tag_id) VALUES (2, '1')",
      "INSERT INTO albums_tags (album_id, tag_id) VALUES (2, '3')",
      'COMMIT']
  end

  it "should automatically convert keys to numbers for appropriate integer primary key for composite key associations" do
    @Hit.db_schema[:year][:type] = :integer
    @Hit.db_schema[:week][:type] = :integer
    @Vocalist.many_to_many :hits, :class=>@Hit, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :delay_pks=>false
    @Vocalist.load(:first=>'F2', :last=>'L2').hit_pks = [['1997', '1'], ['1997', '2']]
    sqls = @db.sqls
    sqls[0].must_equal "DELETE FROM vocalists_hits WHERE ((first = 'F2') AND (last = 'L2') AND ((year, week) NOT IN ((1997, 1), (1997, 2))))"
    sqls[1].must_equal "SELECT year, week FROM vocalists_hits WHERE ((first = 'F2') AND (last = 'L2'))"
    match = sqls[3].match(/INSERT INTO vocalists_hits \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"'F2'", "last"=>"'L2'", "year"=>"1997", "week"=>"1")
    sqls.length.must_equal 5

    @Vocalist.db_schema[:first][:type] = :integer
    @Vocalist.db_schema[:last][:type] = :integer
    @Album.one_to_many :vocalists, :class=>@Vocalist, :key=>:album_id, :delay_pks=>false
    @Album.load(:id=>1).vocalist_pks = [["11", "11"], ["12", "12"]]
    @db.sqls.must_equal ["UPDATE vocalists SET album_id = 1 WHERE ((first, last) IN ((11, 11), (12, 12)))",
      "UPDATE vocalists SET album_id = NULL WHERE ((vocalists.album_id = 1) AND ((first, last) NOT IN ((11, 11), (12, 12))))"]

    @Album.many_to_many :vocalists, :class=>@Vocalist, :join_table=>:albums_vocalists, :left_key=>:album_id, :right_key=>[:first, :last], :delay_pks=>false
    @Album.load(:id=>2).vocalist_pks = [["11", "11"], ["12", "12"]]
    sqls = @db.sqls
    sqls[0].must_equal "DELETE FROM albums_vocalists WHERE ((album_id = 2) AND ((first, last) NOT IN ((11, 11), (12, 12))))"
    sqls[1].must_equal 'SELECT first, last FROM albums_vocalists WHERE (album_id = 2)'
    match = sqls[3].match(/INSERT INTO albums_vocalists \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"11", "last"=>"11", "album_id"=>"2")
    match = sqls[4].match(/INSERT INTO albums_vocalists \((.*)\) VALUES \((.*)\)/)
    Hash[match[1].split(', ').zip(match[2].split(', '))].must_equal("first"=>"12", "last"=>"12", "album_id"=>"2")
    sqls.length.must_equal 6
  end

  it "should handle delaying setting of association pks until after saving for existing objects, if :delay_pks=>:always association option is used" do
    @Artist.one_to_many :albums, :clone=>:albums, :delay_pks=>:always
    @Album.many_to_many :tags, :clone=>:tags, :delay_pks=>:always
    @Album.db_schema[:id][:type] = :integer

    ar = @Artist.new
    ar.album_pks.must_equal []
    ar.album_pks = ["1","2","3"]
    ar.album_pks.must_equal [1,2,3]
    @db.sqls.must_equal []

    ar.save
    @db.sqls.must_equal [
      "INSERT INTO artists DEFAULT VALUES",
      "SELECT * FROM artists WHERE (id = 1) LIMIT 1",
      "UPDATE albums SET artist_id = 1 WHERE (id IN (1, 2, 3))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN (1, 2, 3)))",
    ]

    al = @Album.new
    al.tag_pks.must_equal []
    al.tag_pks = [1,2]
    al.tag_pks.must_equal [1, 2]
    @db.sqls.must_equal []

    al.save
    @db.sqls.must_equal [
      "INSERT INTO albums DEFAULT VALUES",
      "SELECT * FROM albums WHERE (id = 2) LIMIT 1",
      "DELETE FROM albums_tags WHERE ((album_id = 2) AND (tag_id NOT IN (1, 2)))",
      "SELECT tag_id FROM albums_tags WHERE (album_id = 2)",
      "BEGIN",
      "INSERT INTO albums_tags (album_id, tag_id) VALUES (2, 1)",
      "COMMIT"
    ]
    ar = @Artist.load(:id=>1)
    ar.album_pks.must_equal [1,2,3]
    @db.sqls
    ar.album_pks = ["2","4"]
    ar.album_pks.must_equal [2,4]
    @db.sqls.must_equal []

    ar.save_changes
    @db.sqls.must_equal [
      "UPDATE albums SET artist_id = 1 WHERE (id IN (2, 4))",
      "UPDATE albums SET artist_id = NULL WHERE ((albums.artist_id = 1) AND (id NOT IN (2, 4)))"
    ]

    ar.album_pks = []
    @db.sqls.must_equal []

    ar.save_changes
    @db.sqls.must_equal [
      "UPDATE albums SET artist_id = NULL WHERE (artist_id = 1)"
    ]

    al = @Album.load(:id=>1)
    al.tag_pks.must_equal [1,2]
    @db.sqls
    al.tag_pks = [2,3]
    al.tag_pks.must_equal [2,3]
    @db.sqls.must_equal []

    al.save_changes
    @db.sqls.must_equal [
      "DELETE FROM albums_tags WHERE ((album_id = 1) AND (tag_id NOT IN (2, 3)))",
      "SELECT tag_id FROM albums_tags WHERE (album_id = 1)",
      "BEGIN",
      "INSERT INTO albums_tags (album_id, tag_id) VALUES (1, 3)",
      "COMMIT",
    ]

    al.tag_pks = []
    @db.sqls.must_equal []

    al.save_changes
    @db.sqls.must_equal [
      "DELETE FROM albums_tags WHERE (album_id = 1)",
    ]
  end

  it "should clear delayed associated pks if refreshing, if :delay plugin option is used" do
    @Artist.one_to_many :albums, :clone=>:albums, :delay_pks=>:always
    @Album.many_to_many :tags, :clone=>:tags, :delay_pks=>:always

    ar = @Artist.load(:id=>1)
    ar.album_pks.must_equal [1,2,3]
    ar.album_pks = [2,4]
    ar.album_pks.must_equal [2,4]
    ar.refresh
    ar.album_pks.must_equal [1,2,3]
  end

  it "should remove all values if nil given to setter and :association_pks_nil=>:remove" do
    @Artist.one_to_many :albums, :clone=>:albums, :association_pks_nil=>:remove

    ar = @Artist.load(:id=>1)
    ar.album_pks = nil
    @db.sqls.must_equal ["UPDATE albums SET artist_id = NULL WHERE (artist_id = 1)"]
  end

  it "should take no action if nil given to setter and :association_pks_nil=>:ignore" do
    @Artist.one_to_many :albums, :clone=>:albums, :association_pks_nil=>:ignore

    ar = @Artist.load(:id=>1)
    ar = @Artist.new
    ar.album_pks = nil
    @db.sqls.must_equal []
  end

  it "should raise error if nil given to setter by default" do
    ar = @Artist.load(:id=>1)
    proc{ar.album_pks = nil}.must_raise Sequel::Error
  end
end
