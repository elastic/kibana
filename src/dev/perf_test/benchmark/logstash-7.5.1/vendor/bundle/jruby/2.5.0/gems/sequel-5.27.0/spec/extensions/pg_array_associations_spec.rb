require_relative "spec_helper"

describe Sequel::Model, "pg_array_associations" do
  before do
    @db = Sequel.mock(:host=>'postgres', :numrows=>1)
    @db.extend_datasets{def quote_identifiers?; false end}
    class ::Artist < Sequel::Model(@db)
      attr_accessor :yyy
      columns :id, :tag_ids
      plugin :pg_array_associations
      pg_array_to_many :tags
      pg_array_to_many :a_tags, :clone=>:tags, :conditions=>{:name=>'A'}, :key=>:tag_ids
    end
    class ::Tag < Sequel::Model(@db)
      columns :id
      plugin :pg_array_associations
      many_to_pg_array :artists
      many_to_pg_array :a_artists, :clone=>:artists, :conditions=>{:name=>'A'}
      def id3
        id*3
      end
    end
    @c1 = Artist
    @c2 = Tag
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tag_ids=>Sequel.pg_array([1,2,3]))
    @c2.dataset = @c2.dataset.with_fetch(:id=>2)
    @o1 = @c1.first
    @o2 = @c2.first
    @n1 = @c1.new
    @n2 = @c2.new
    @db.sqls
  end
  after do
    Object.send(:remove_const, :Artist)
    Object.send(:remove_const, :Tag)
  end

  it "should populate :key_hash and :id_map option correctly for custom eager loaders" do
    khs = []
    pr = proc{|h| khs << [h[:key_hash], h[:id_map]]}
    @c1.pg_array_to_many :tags, :clone=>:tags, :eager_loader=>pr
    @c2.many_to_pg_array :artists, :clone=>:artists, :eager_loader=>pr
    @c1.eager(:tags).all
    @c2.eager(:artists).all
    khs.must_equal [[{}, nil], [{:id=>{2=>[Tag.load(:id=>2)]}}, {2=>[Tag.load(:id=>2)]}]]
  end

  it "should not issue queries if the object cannot have associated objects" do
    @n1.tags.must_equal []
    @c1.load(:tag_ids=>[]).tags.must_equal []
    @n2.artists.must_equal []
    @db.sqls.must_equal []
  end

  it "should use correct SQL when loading associations lazily" do
    @o1.tags.must_equal [@o2]
    @o2.artists.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))", "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[2]::integer[])"]
  end

  it "should accept :primary_key option for primary keys to use in current and associated table" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :primary_key=>Sequel./(:id, 3)
    @c2.many_to_pg_array :artists, :clone=>:artists, :primary_key=>:id3
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE ((tags.id / 3) IN (1, 2, 3))"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[6]::integer[])"
  end
  
  it "should allowing filtering by associations" do
    @c1.filter(:tags=>@o2).sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[2]::integer[])"
    @c2.filter(:artists=>@o1).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))"
  end

  it "should allowing filtering by associations with :conditions" do
    @c1.filter(:a_tags=>@o2).sql.must_equal "SELECT * FROM artists WHERE coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id = 2)))), false)"
    @c2.filter(:a_artists=>@o1).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id = 1))))"
  end

  it "should allowing excluding by associations" do
    @c1.exclude(:tags=>@o2).sql.must_equal "SELECT * FROM artists WHERE (NOT (artists.tag_ids @> ARRAY[2]::integer[]) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:artists=>@o1).sql.must_equal "SELECT * FROM tags WHERE ((tags.id NOT IN (1, 2, 3)) OR (tags.id IS NULL))"
  end

  it "should allowing excluding by associations with :conditions" do
    @c1.exclude(:a_tags=>@o2).sql.must_equal "SELECT * FROM artists WHERE (NOT coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id = 2)))), false) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:a_artists=>@o1).sql.must_equal "SELECT * FROM tags WHERE ((tags.id NOT IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id = 1)))) OR (tags.id IS NULL))"
  end

  it "should allowing filtering by multiple associations" do
    @c1.filter(:tags=>[@c2.load(:id=>1), @c2.load(:id=>2)]).sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[1,2]::integer[])"
    @c2.filter(:artists=>[@c1.load(:tag_ids=>Sequel.pg_array([3, 4])), @c1.load(:tag_ids=>Sequel.pg_array([4, 5]))]).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (3, 4, 5))"
  end

  it "should allowing filtering by multiple associations with :conditions" do
    @c1.filter(:a_tags=>[@c2.load(:id=>1), @c2.load(:id=>2)]).sql.must_equal "SELECT * FROM artists WHERE coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id IN (1, 2))))), false)"
    @c2.filter(:a_artists=>[@c1.load(:id=>7, :tag_ids=>Sequel.pg_array([3, 4])), @c1.load(:id=>8, :tag_ids=>Sequel.pg_array([4, 5]))]).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id IN (7, 8)))))"
  end

  it "should allowing excluding by multiple associations" do
    @c1.exclude(:tags=>[@c2.load(:id=>1), @c2.load(:id=>2)]).sql.must_equal "SELECT * FROM artists WHERE (NOT (artists.tag_ids && ARRAY[1,2]::integer[]) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:artists=>[@c1.load(:tag_ids=>Sequel.pg_array([3, 4])), @c1.load(:tag_ids=>Sequel.pg_array([4, 5]))]).sql.must_equal "SELECT * FROM tags WHERE ((tags.id NOT IN (3, 4, 5)) OR (tags.id IS NULL))"
  end

  it "should allowing excluding by multiple associations with :conditions" do
    @c1.exclude(:a_tags=>[@c2.load(:id=>1), @c2.load(:id=>2)]).sql.must_equal "SELECT * FROM artists WHERE (NOT coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id IN (1, 2))))), false) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:a_artists=>[@c1.load(:id=>7, :tag_ids=>Sequel.pg_array([3, 4])), @c1.load(:id=>8, :tag_ids=>Sequel.pg_array([4, 5]))]).sql.must_equal "SELECT * FROM tags WHERE ((tags.id NOT IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id IN (7, 8))))) OR (tags.id IS NULL))"
  end

  it "should allowing filtering/excluding associations with NULL or empty values" do
    @c1.filter(:tags=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE false'
    @c1.exclude(:tags=>@c2.new).sql.must_equal 'SELECT * FROM artists WHERE true'
    @c2.filter(:artists=>@c1.new).sql.must_equal 'SELECT * FROM tags WHERE false'
    @c2.exclude(:artists=>@c1.new).sql.must_equal 'SELECT * FROM tags WHERE true'

    @c2.filter(:artists=>@c1.load(:tag_ids=>[])).sql.must_equal 'SELECT * FROM tags WHERE false'
    @c2.exclude(:artists=>@c1.load(:tag_ids=>[])).sql.must_equal 'SELECT * FROM tags WHERE true'

    @c1.filter(:tags=>[@c2.new, @c2.load(:id=>2)]).sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"
    @c2.filter(:artists=>[@c1.load(:tag_ids=>Sequel.pg_array([3, 4])), @c1.new]).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (3, 4))"
  end

  it "should allowing filtering by association datasets" do
    @c1.filter(:tags=>@c2.where(:id=>1)).sql.must_equal "SELECT * FROM artists WHERE coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE (id = 1))), false)"
    @c2.filter(:artists=>@c1.where(:id=>1)).sql.must_equal "SELECT * FROM tags WHERE (EXISTS (SELECT 1 FROM (SELECT artists.tag_ids AS key FROM artists WHERE (id = 1)) AS t1 WHERE (tags.id = any(key))))"
  end

  it "should allowing filtering by association datasets with :conditions" do
    @c1.filter(:a_tags=>@c2.where(:id=>1)).sql.must_equal "SELECT * FROM artists WHERE coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (id = 1)))))), false)"
    @c2.filter(:a_artists=>@c1.where(:id=>1)).sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (id = 1))))))"
  end

  it "should allowing excluding by association datasets" do
    @c1.exclude(:tags=>@c2.where(:id=>1)).sql.must_equal "SELECT * FROM artists WHERE (NOT coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE (id = 1))), false) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:artists=>@c1.where(:id=>1)).sql.must_equal "SELECT * FROM tags WHERE (NOT (EXISTS (SELECT 1 FROM (SELECT artists.tag_ids AS key FROM artists WHERE (id = 1)) AS t1 WHERE (tags.id = any(key)))) OR (tags.id IS NULL))"
  end

  it "should allowing excluding by association datasets with :conditions" do
    @c1.exclude(:a_tags=>@c2.where(:id=>1)).sql.must_equal "SELECT * FROM artists WHERE (NOT coalesce((artists.tag_ids && (SELECT array_agg(tags.id) FROM tags WHERE ((name = 'A') AND (tags.id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (id = 1)))))), false) OR (artists.tag_ids IS NULL))"
    @c2.exclude(:a_artists=>@c1.where(:id=>1)).sql.must_equal "SELECT * FROM tags WHERE ((tags.id NOT IN (SELECT _smtopgaa_key_ FROM artists CROSS JOIN unnest(artists.tag_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE ((name = 'A') AND (artists.tag_ids IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (id = 1)))))) OR (tags.id IS NULL))"
  end

  it "filter by associations should respect key options" do 
    @c1.class_eval{def tag3_ids; tag_ids.map{|x| x*3} end}
    @c1.pg_array_to_many :tags, :clone=>:tags, :primary_key=>Sequel.*(:id, 3), :primary_key_method=>:id3, :key=>:tag3_ids, :key_column=>Sequel.pg_array(:tag_ids)[1..2]
    @c2.many_to_pg_array :artists, :clone=>:artists, :primary_key=>Sequel.*(:id, 3), :primary_key_method=>:id3, :key=>:tag3_ids, :key_column=>Sequel.pg_array(:tag_ids)[1..2]

    @c1.filter(:tags=>@o2).sql.must_equal "SELECT * FROM artists WHERE ((artists.tag_ids)[1:2] @> ARRAY[6]::integer[])"
    @c2.filter(:artists=>@o1).sql.must_equal "SELECT * FROM tags WHERE ((tags.id * 3) IN (3, 6, 9))"
    @c1.filter(:tags=>@c2.where(:id=>1)).sql.must_equal "SELECT * FROM artists WHERE coalesce(((artists.tag_ids)[1:2] && (SELECT array_agg((tags.id * 3)) FROM tags WHERE (id = 1))), false)"
    @c2.filter(:artists=>@c1.where(:id=>1)).sql.must_equal "SELECT * FROM tags WHERE (EXISTS (SELECT 1 FROM (SELECT (artists.tag_ids)[1:2] AS key FROM artists WHERE (id = 1)) AS t1 WHERE ((tags.id * 3) = any(key))))"
  end
  
  it "should raise an error if associated model does not have a primary key, and :primary_key is not specified" do
    @c1.no_primary_key
    @c2.no_primary_key
    @c1.pg_array_to_many :tags, :clone=>:tags
    proc{@o1.tags}.must_raise(Sequel::Error)
    proc{@c2.many_to_pg_array :artists, :clone=>:artists}.must_raise(Sequel::Error)
    @db.sqls.must_equal []
  end
  
  it "should support a :key option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :key=>:tag2_ids
    @c2.many_to_pg_array :artists, :clone=>:artists, :key=>:tag2_ids
    @c1.class_eval{def tag2_ids; tag_ids.map{|x| x * 2} end}
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (2, 4, 6))"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE (artists.tag2_ids @> ARRAY[2]::integer[])"
  end
  
  it "should support a :key_column option" do
    @c2.many_to_pg_array :artists, :clone=>:artists, :key_column=>Sequel.pg_array(:tag_ids)[1..2], :key=>:tag2_ids
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE ((artists.tag_ids)[1:2] @> ARRAY[2]::integer[])"
  end
  
  it "should support a :primary_key option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :primary_key=>:id2
    @c2.many_to_pg_array :artists, :clone=>:artists, :primary_key=>:id2
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE (tags.id2 IN (1, 2, 3))"
    @c2.class_eval{def id2; id*2 end}
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[4]::integer[])"
  end
  
  it "should support a :conditions option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :conditions=>{:a=>1}
    @c2.many_to_pg_array :artists, :clone=>:artists, :conditions=>{:a=>1}
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE ((a = 1) AND (tags.id IN (1, 2, 3)))"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE ((a = 1) AND (artists.tag_ids @> ARRAY[2]::integer[]))"
  end
  
  it "should support an :order option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :order=>[:a, :b]
    @c2.many_to_pg_array :artists, :clone=>:artists, :order=>[:a, :b]
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (1, 2, 3)) ORDER BY a, b"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[2]::integer[]) ORDER BY a, b"
  end
  
  it "should support a select option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :select=>[:a, :b]
    @c2.many_to_pg_array :artists, :clone=>:artists, :select=>[:a, :b]
    @c1.load(:tag_ids=>Sequel.pg_array([1,2,3])).tags_dataset.sql.must_equal "SELECT a, b FROM tags WHERE (tags.id IN (1, 2, 3))"
    @c2.load(:id=>1).artists_dataset.sql.must_equal "SELECT a, b FROM artists WHERE (artists.tag_ids @> ARRAY[1]::integer[])"
  end
  
  it "should accept a block" do
    @c1.pg_array_to_many :tags, :clone=>:tags do |ds| ds.filter(:yyy=>@yyy) end
    @c2.many_to_pg_array :artists, :clone=>:artists do |ds| ds.filter(:a=>1) end
    @c1.new(:yyy=>6, :tag_ids=>Sequel.pg_array([1,2,3])).tags_dataset.sql.must_equal "SELECT * FROM tags WHERE ((tags.id IN (1, 2, 3)) AND (yyy = 6))"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE ((artists.tag_ids @> ARRAY[2]::integer[]) AND (a = 1))"
  end

  it "should support a :dataset option that is used instead of the default" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :dataset=>proc{Tag.where(:id=>tag_ids.map{|x| x*2})}
    @c2.many_to_pg_array :artists, :clone=>:artists, :dataset=>proc{Artist.where(Sequel.pg_array(Sequel.pg_array(:tag_ids)[1..2]).contains([id]))}
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE (id IN (2, 4, 6))"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE ((tag_ids)[1:2] @> ARRAY[2])"
  end

  it "should support a :limit option" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :limit=>[2, 3]
    @c2.many_to_pg_array :artists, :clone=>:artists, :limit=>[3, 2]
    @o1.tags_dataset.sql.must_equal "SELECT * FROM tags WHERE (tags.id IN (1, 2, 3)) LIMIT 2 OFFSET 3"
    @o2.artists_dataset.sql.must_equal "SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[2]::integer[]) LIMIT 3 OFFSET 2"
  end

  it "should support a :uniq option that removes duplicates from the association" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :uniq=>true
    @c2.many_to_pg_array :artists, :clone=>:artists, :uniq=>true
    @c1.dataset = @c1.dataset.with_fetch([{:id=>20}, {:id=>30}, {:id=>20}, {:id=>30}])
    @c2.dataset = @c1.dataset.with_fetch([{:id=>20}, {:id=>30}, {:id=>20}, {:id=>30}])
    @o1.tags.must_equal [@c2.load(:id=>20), @c2.load(:id=>30)]
    @o2.artists.must_equal [@c1.load(:id=>20), @c1.load(:id=>30)]
  end

  it "reflection associated_object_keys should return correct values" do
    @c1.association_reflection(:tags).associated_object_keys.must_equal [:id]
    @c2.association_reflection(:artists).associated_object_keys.must_equal [:tag_ids]
  end
  
  it "reflection remove_before_destroy? should return correct values" do
    @c1.association_reflection(:tags).remove_before_destroy?.must_equal true
    @c2.association_reflection(:artists).remove_before_destroy?.must_equal false
  end
  
  it "reflection reciprocal should be correct" do
    @c1.association_reflection(:tags).reciprocal.must_equal :artists
    @c2.association_reflection(:artists).reciprocal.must_equal :tags
  end

  it "should eagerly load correctly" do
    a = @c1.eager(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))']
    a.first.tags.must_equal [@o2]
    @db.sqls.must_equal []

    a = @c2.eager(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ['SELECT * FROM tags', "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.first.artists.must_equal [@o1]
    @db.sqls.must_equal []
  end
  
  it "should support using custom key options when eager loading associations" do
    @c1.class_eval{def tag3_ids; tag_ids.map{|x| x*3} end}
    @c1.pg_array_to_many :tags, :clone=>:tags, :primary_key=>Sequel.*(:id, 3), :primary_key_method=>:id3, :key=>:tag3_ids
    @c2.many_to_pg_array :artists, :clone=>:artists, :primary_key=>:id3, :key=>:tag3_ids, :key_column=>Sequel.pg_array(:tag_ids)[1..2]

    a = @c1.eager(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE ((tags.id * 3) IN (3, 6, 9))']
    a.first.tags.must_equal [@o2]
    @db.sqls.must_equal []

    a = @c2.eager(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ["SELECT * FROM tags", "SELECT * FROM artists WHERE ((artists.tag_ids)[1:2] && ARRAY[6]::integer[])"]
    a.first.artists.must_equal [@o1]
    @db.sqls.must_equal []
  end

  it "should allow cascading of eager loading for associations of associated models" do
    a = @c1.eager(:tags=>:artists).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))',
      "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.first.tags.must_equal [@o2]
    a.first.tags.first.artists.must_equal [@o1]
    @db.sqls.must_equal []
  end
  
  it "should respect :eager when lazily loading an association" do
    @c1.pg_array_to_many :tags2, :clone=>:tags, :eager=>:artists, :key=>:tag_ids
    @c2.many_to_pg_array :artists2, :clone=>:artists, :eager=>:tags

    @o1.tags2.must_equal [@o2]
    @db.sqls.must_equal ["SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))", "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    @o1.tags2.first.artists.must_equal [@o1]
    @db.sqls.must_equal []

    @o2.artists2.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[2]::integer[])",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))']
    @o2.artists2.first.tags.must_equal [@o2]
    @db.sqls.must_equal []
  end
  
  it "should cascade eagerly loading when the :eager_graph association option is used" do
    @c1.pg_array_to_many :tags2, :clone=>:tags, :eager_graph=>:artists, :key=>:tag_ids
    @c2.many_to_pg_array :artists2, :clone=>:artists, :eager_graph=>:tags

    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1, :tag_ids=>Sequel.pg_array([1,2,3]))
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tags_id=>2, :tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    @o1.tags2.must_equal [@o2]
    @db.sqls.must_equal ['SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id]) WHERE (tags.id IN (1, 2, 3))']
    @o1.tags2.first.artists.must_equal [@o1]
    @db.sqls.must_equal []

    @o2.artists2.must_equal [@o1]
    @db.sqls.must_equal ["SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id]) WHERE (artists.tag_ids @> ARRAY[2]::integer[])"]
    @o2.artists2.first.tags.must_equal [@o2]
    @db.sqls.must_equal []

    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1, :tag_ids=>Sequel.pg_array([1,2,3]))
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c1.eager(:tags2).all
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id]) WHERE (tags.id IN (1, 2, 3))']
    a.must_equal [@o1]
    a.first.tags2.must_equal [@o2]
    a.first.tags2.first.artists.must_equal [@o1]
    @db.sqls.must_equal []

    @c2.dataset = @c2.dataset.with_fetch(:id=>2)
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tags_id=>2, :tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c2.eager(:artists2).all
    @db.sqls.must_equal ["SELECT * FROM tags", "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id]) WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.must_equal [@o2]
    a.first.artists2.must_equal [@o1]
    a.first.artists2.first.tags.must_equal [@o2]
    @db.sqls.must_equal []
  end
  
  it "should respect the :limit option when eager loading" do
    @c2.dataset = @c2.dataset.with_fetch([{:id=>1},{:id=>2}, {:id=>3}])
    @db.sqls

    @c1.pg_array_to_many :tags, :clone=>:tags, :limit=>2
    a = @c1.eager(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))']
    a.first.tags.must_equal [@c2.load(:id=>1), @c2.load(:id=>2)]
    @db.sqls.must_equal []

    @c1.pg_array_to_many :tags, :clone=>:tags, :limit=>[1, 1]
    a = @c1.eager(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))']
    a.first.tags.must_equal [@c2.load(:id=>2)]
    @db.sqls.must_equal []

    @c1.pg_array_to_many :tags, :clone=>:tags, :limit=>[nil, 1]
    a = @c1.eager(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT * FROM artists",
      'SELECT * FROM tags WHERE (tags.id IN (1, 2, 3))']
    a.first.tags.must_equal [@c2.load(:id=>2), @c2.load(:id=>3)]
    @db.sqls.length.must_equal 0

    @c2.dataset = @c2.dataset.with_fetch(:id=>2)
    @c1.dataset = @c1.dataset.with_fetch([{:id=>5, :tag_ids=>Sequel.pg_array([1,2,3])},{:id=>6, :tag_ids=>Sequel.pg_array([2,3])}, {:id=>7, :tag_ids=>Sequel.pg_array([1,2])}])
    @db.sqls

    @c2.many_to_pg_array :artists, :clone=>:artists, :limit=>2
    a = @c2.eager(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ['SELECT * FROM tags', "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.first.artists.must_equal [@c1.load(:id=>5, :tag_ids=>Sequel.pg_array([1,2,3])), @c1.load(:id=>6, :tag_ids=>Sequel.pg_array([2,3]))]
    @db.sqls.must_equal []

    @c2.many_to_pg_array :artists, :clone=>:artists, :limit=>[1, 1]
    a = @c2.eager(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ['SELECT * FROM tags', "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.first.artists.must_equal [@c1.load(:id=>6, :tag_ids=>Sequel.pg_array([2,3]))]
    @db.sqls.must_equal []

    @c2.many_to_pg_array :artists, :clone=>:artists, :limit=>[nil, 1]
    a = @c2.eager(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ['SELECT * FROM tags', "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::integer[])"]
    a.first.artists.must_equal [@c1.load(:id=>6, :tag_ids=>Sequel.pg_array([2,3])), @c1.load(:id=>7, :tag_ids=>Sequel.pg_array([1,2]))]
    @db.sqls.must_equal []
  end

  it "should support association_join" do
    @c1.association_join(:tags).sql.must_equal "SELECT * FROM artists INNER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id])"
    @c2.association_join(:artists).sql.must_equal "SELECT * FROM tags INNER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id])"
  end

  it "should support custom selects when using association_join" do
    @c1.select{a(b)}.association_join(:tags).sql.must_equal "SELECT a(b) FROM artists INNER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id])"
    @c2.select{a(b)}.association_join(:artists).sql.must_equal "SELECT a(b) FROM tags INNER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id])"
  end

  it "should eagerly graph associations" do
    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1, :tag_ids=>Sequel.pg_array([1,2,3]))
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tags_id=>2, :tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c1.eager_graph(:tags).all
    @db.sqls.must_equal ["SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id])"]
    a.must_equal [@o1]
    a.first.tags.must_equal [@o2]
    @db.sqls.must_equal []

    a = @c2.eager_graph(:artists).all
    @db.sqls.must_equal ["SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id])"]
    a.must_equal [@o2]
    a.first.artists.must_equal [@o1]
    @db.sqls.must_equal []
  end

  it "should allow cascading of eager graphing for associations of associated models" do
    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1, :tag_ids=>Sequel.pg_array([1,2,3]), :tags_0_id=>2)
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tags_id=>2, :tag_ids=>Sequel.pg_array([1,2,3]), :artists_0_id=>1, :artists_0_tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c1.eager_graph(:tags=>:artists).all
    @db.sqls.must_equal ["SELECT artists.id, artists.tag_ids, tags.id AS tags_id, artists_0.id AS artists_0_id, artists_0.tag_ids AS artists_0_tag_ids FROM artists LEFT OUTER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id]) LEFT OUTER JOIN artists AS artists_0 ON (artists_0.tag_ids @> ARRAY[tags.id])"]
    a.must_equal [@o1]
    a.first.tags.must_equal [@o2]
    a.first.tags.first.artists.must_equal [@o1]
    @db.sqls.must_equal []

    a = @c2.eager_graph(:artists=>:tags).all
    @db.sqls.must_equal ["SELECT tags.id, artists.id AS artists_id, artists.tag_ids, tags_0.id AS tags_0_id FROM tags LEFT OUTER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id]) LEFT OUTER JOIN tags AS tags_0 ON (artists.tag_ids @> ARRAY[tags_0.id])"]
    a.must_equal [@o2]
    a.first.artists.must_equal [@o1]
    a.first.artists.first.tags.must_equal [@o2]
    @db.sqls.must_equal []
  end
  
  it "eager graphing should respect key options" do 
    @c1.class_eval{def tag3_ids; tag_ids.map{|x| x*3} end}
    @c1.pg_array_to_many :tags, :clone=>:tags, :primary_key=>Sequel.*(:id, 3), :primary_key_method=>:id3, :key=>:tag3_ids, :key_column=>Sequel.pg_array(:tag_ids)[1..2]
    @c2.many_to_pg_array :artists, :clone=>:artists, :primary_key=>:id3, :key=>:tag3_ids, :key_column=>Sequel.pg_array(:tag_ids)[1..2]

    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1, :tag_ids=>Sequel.pg_array([1,2,3]), :tags_0_id=>2)
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :tags_id=>2, :tag_ids=>Sequel.pg_array([1,2,3]), :artists_0_id=>1, :artists_0_tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c1.eager_graph(:tags).all
    a.must_equal [@o1]
    @db.sqls.must_equal ["SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON ((artists.tag_ids)[1:2] @> ARRAY[(tags.id * 3)])"]
    a.first.tags.must_equal [@o2]
    @db.sqls.must_equal []

    a = @c2.eager_graph(:artists).all
    a.must_equal [@o2]
    @db.sqls.must_equal ["SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON ((artists.tag_ids)[1:2] @> ARRAY[tags.id3])"]
    a.first.artists.must_equal [@o1]
    @db.sqls.must_equal []
  end
  
  it "should respect the association's :graph_select option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_select=>:id2
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_select=>:id

    @c2.dataset = @c2.dataset.with_fetch(:id=>2, :artists_id=>1)
    @c1.dataset = @c1.dataset.with_fetch(:id=>1, :id2=>2, :tag_ids=>Sequel.pg_array([1,2,3]))
    @db.sqls

    a = @c1.eager_graph(:tags).all
    @db.sqls.must_equal ["SELECT artists.id, artists.tag_ids, tags.id2 FROM artists LEFT OUTER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id])"]
    a.must_equal [@o1]
    a.first.tags.must_equal [@c2.load(:id2=>2)]
    @db.sqls.must_equal []

    a = @c2.eager_graph(:artists).all
    @db.sqls.must_equal ["SELECT tags.id, artists.id AS artists_id FROM tags LEFT OUTER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id])"]
    a.must_equal [@o2]
    a.first.artists.must_equal [@c1.load(:id=>1)]
    @db.sqls.must_equal []
  end

  it "should respect the association's :graph_join_type option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_join_type=>:inner
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_join_type=>:inner
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists INNER JOIN tags ON (artists.tag_ids @> ARRAY[tags.id])"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags INNER JOIN artists ON (artists.tag_ids @> ARRAY[tags.id])"
  end

  it "should respect the association's :conditions option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :conditions=>{:a=>1}
    @c2.many_to_pg_array :artists, :clone=>:artists, :conditions=>{:a=>1}
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON ((tags.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON ((artists.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
  end

  it "should respect the association's :graph_conditions option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_conditions=>{:a=>1}
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_conditions=>{:a=>1}
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON ((tags.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON ((artists.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
  end

  it "should respect the association's :graph_block option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :a)=>1}}
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(ja, :a)=>1}}
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON ((tags.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON ((artists.a = 1) AND (artists.tag_ids @> ARRAY[tags.id]))"
  end

  it "should respect the association's :graph_only_conditions option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_only_conditions=>{:a=>1}
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_only_conditions=>{:a=>1}
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON (tags.a = 1)"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON (artists.a = 1)"
  end

  it "should respect the association's :graph_only_conditions with :graph_block option" do 
    @c1.pg_array_to_many :tags, :clone=>:tags, :graph_only_conditions=>{:a=>1}, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(lja, :b)=>1}}
    @c2.many_to_pg_array :artists, :clone=>:artists, :graph_only_conditions=>{:a=>1}, :graph_block=>proc{|ja,lja,js| {Sequel.qualify(lja, :b)=>1}}
    @c1.eager_graph(:tags).sql.must_equal "SELECT artists.id, artists.tag_ids, tags.id AS tags_id FROM artists LEFT OUTER JOIN tags ON ((tags.a = 1) AND (artists.b = 1))"
    @c2.eager_graph(:artists).sql.must_equal "SELECT tags.id, artists.id AS artists_id, artists.tag_ids FROM tags LEFT OUTER JOIN artists ON ((artists.a = 1) AND (tags.b = 1))"
  end

  it "should define an add_ method for adding associated objects" do
    @o1.add_tag(@c2.load(:id=>4))
    @o1.tag_ids.must_equal [1,2,3,4]
    @db.sqls.must_equal []
    @o1.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1,2,3,4] WHERE (id = 1)"]

    @o2.add_artist(@c1.load(:id=>1, :tag_ids=>Sequel.pg_array([4])))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[4,2] WHERE (id = 1)"]
  end

  it "should define a remove_ method for removing associated objects" do
    @o1.remove_tag(@o2)
    @o1.tag_ids.must_equal [1,3]
    @db.sqls.must_equal []
    @o1.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1,3] WHERE (id = 1)"]

    @o2.remove_artist(@c1.load(:id=>1, :tag_ids=>Sequel.pg_array([1,2,3,4])))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1,3,4] WHERE (id = 1)"]
  end

  it "should define a remove_all_ method for removing all associated objects" do
    @o1.remove_all_tags
    @o1.tag_ids.must_equal []
    @db.sqls.must_equal []
    @o1.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[] WHERE (id = 1)"]

    @o2.remove_all_artists
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = array_remove(tag_ids, CAST(2 AS integer)) WHERE (tag_ids @> ARRAY[2]::integer[])"]
  end

  it "should define a remove_all_ method for removing all associated objects respecting database type" do
    @c2.many_to_pg_array :artists, :clone=>:artists, :array_type=>:bigint
    @o1.remove_all_tags
    @o1.tag_ids.must_equal []
    @db.sqls.must_equal []
    @o1.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[] WHERE (id = 1)"]

    @o2.remove_all_artists
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = array_remove(tag_ids, CAST(2 AS bigint)) WHERE (tag_ids @> ARRAY[2]::bigint[])"]
  end

  it "should allow calling add_ and remove_ methods on new objects for pg_array_to_many associations" do
    a = Artist.new
    a.add_tag(@c2.load(:id=>4))
    a.tag_ids.must_equal [4]
    a.remove_tag(@c2.load(:id=>4))
    a.tag_ids.must_equal []
    a.add_tag(@c2.load(:id=>4))
    a.tag_ids.must_equal [4]
    a.remove_all_tags
    a.tag_ids.must_equal []
  end

  it "should have pg_array_to_many association modification methods save if :save_after_modify option is used" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :save_after_modify=>true

    @o1.add_tag(@c2.load(:id=>4))
    @o1.tag_ids.must_equal [1,2,3,4]
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1,2,3,4] WHERE (id = 1)"]

    @o1.remove_tag(@o2)
    @o1.tag_ids.must_equal [1,3,4]
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1,3,4] WHERE (id = 1)"]

    @o1.remove_all_tags
    @o1.tag_ids.must_equal []
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[] WHERE (id = 1)"]
  end

  it "should have association modification methods deal with nil values" do
    v = @c1.load(:id=>1)
    v.add_tag(@c2.load(:id=>4))
    v.tag_ids.must_equal [4]
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[4]::integer[] WHERE (id = 1)"]

    @o2.add_artist(@c1.load(:id=>1))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[2]::integer[] WHERE (id = 1)"]

    v = @c1.load(:id=>1)
    v.remove_tag(@c2.load(:id=>4))
    v.tag_ids.must_be_nil
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal []

    @o2.remove_artist(@c1.load(:id=>1))
    @db.sqls.must_equal []

    v = @c1.load(:id=>1)
    v.remove_all_tags
    v.tag_ids.must_be_nil
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal []
  end

  it "should have association modification methods deal with empty arrays values" do
    v = @c1.load(:id=>1, :tag_ids=>Sequel.pg_array([]))
    v.add_tag(@c2.load(:id=>4))
    v.tag_ids.must_equal [4]
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[4] WHERE (id = 1)"]

    @o2.add_artist(@c1.load(:id=>1, :tag_ids=>Sequel.pg_array([])))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[2] WHERE (id = 1)"]

    v = @c1.load(:id=>1, :tag_ids=>Sequel.pg_array([]))
    v.remove_tag(@c2.load(:id=>4))
    v.tag_ids.must_equal []
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal []

    @o2.remove_artist(@c1.load(:id=>1, :tag_ids=>Sequel.pg_array([])))
    @db.sqls.must_equal []

    v = @c1.load(:id=>1, :tag_ids=>Sequel.pg_array([]))
    v.remove_all_tags
    v.tag_ids.must_equal []
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal []
  end

  it "should respect the :array_type option when manually creating arrays" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :array_type=>:int8
    @c2.many_to_pg_array :artists, :clone=>:artists, :array_type=>:int8
    v = @c1.load(:id=>1)
    v.add_tag(@c2.load(:id=>4))
    v.tag_ids.must_equal [4]
    @db.sqls.must_equal []
    v.save_changes
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[4]::int8[] WHERE (id = 1)"]

    @o2.add_artist(@c1.load(:id=>1))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[2]::int8[] WHERE (id = 1)"]
  end

  it "should respect the :array_type option in the associations dataset" do
    @c2.many_to_pg_array :artists, :clone=>:artists, :array_type=>:int8
    @c2.load(:id=>1).artists_dataset.sql.must_equal 'SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[1]::int8[])'
  end

  it "should respect the :array_type option when eager loading" do
    @c2.many_to_pg_array :artists, :clone=>:artists, :array_type=>:int8
    @c2.eager(:artists).all
    @db.sqls.must_equal ["SELECT * FROM tags", "SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[2]::int8[])"]
  end

  it "should respect the :array_type option when filtering by associations" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :array_type=>:int8
    @c1.where(:tags=>@c2.load(:id=>1)).sql.must_equal 'SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[1]::int8[])'
    @c1.where(:tags=>[@c2.load(:id=>1), @c2.load(:id=>2)]).sql.must_equal 'SELECT * FROM artists WHERE (artists.tag_ids && ARRAY[1,2]::int8[])'
  end

  it "should automatically determine the array type by looking at the schema" do
    @c1.db_schema[:tag_ids][:db_type] = 'int8[]'
    @c2.many_to_pg_array :artists, :clone=>:artists
    @c1.pg_array_to_many :tags, :clone=>:tags, :save_after_modify=>true
    @c2.load(:id=>1).artists_dataset.sql.must_equal 'SELECT * FROM artists WHERE (artists.tag_ids @> ARRAY[1]::int8[])'
    @c1.load(:id=>1).add_tag(@c2.load(:id=>1))
    @db.sqls.must_equal ["UPDATE artists SET tag_ids = ARRAY[1]::int8[] WHERE (id = 1)"]
  end

  it "should automatically determine the array type by looking at the schema" do
  end

  it "should not validate the current/associated object in add_ and remove_ if the :validate=>false option is used" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :validate=>false, :save_after_modify=>true
    @c2.many_to_pg_array :artists, :clone=>:artists, :validate=>false
    a = @c1.load(:id=>1)
    t = @c2.load(:id=>2)
    def a.validate() errors.add(:id, 'foo') end
    a.associations[:tags] = []
    a.add_tag(t).must_equal t
    a.tags.must_equal [t]
    a.remove_tag(t).must_equal t
    a.tags.must_equal []

    t.associations[:artists] = []
    t.add_artist(a).must_equal a
    t.artists.must_equal [a]
    t.remove_artist(a).must_equal a
    t.artists.must_equal []
  end

  it "should not raise exception in add_ and remove_ if the :raise_on_save_failure=>false option is used" do
    @c1.pg_array_to_many :tags, :clone=>:tags, :raise_on_save_failure=>false, :save_after_modify=>true
    @c2.many_to_pg_array :artists, :clone=>:artists, :raise_on_save_failure=>false
    a = @c1.load(:id=>1)
    t = @c2.load(:id=>2)
    def a.validate() errors.add(:id, 'foo') end
    a.associations[:tags] = []
    a.add_tag(t).must_be_nil
    a.tags.must_equal []
    a.associations[:tags] = [t]
    a.remove_tag(t).must_be_nil
    a.tags.must_equal [t]

    t.associations[:artists] = []
    t.add_artist(a).must_be_nil
    t.artists.must_equal []
    t.associations[:artists] = [a]
    t.remove_artist(a).must_be_nil
    t.artists.must_equal [a]
  end
end

describe "Sequel::Model.finalize_associations" do
  before do
    @db = Sequel.mock(:host=>'postgres', :numrows=>1)
    @db.extend_datasets do
      def quote_identifiers?; false end
    end
    class ::Foo < Sequel::Model(@db)
      plugin :pg_array_associations
      many_to_pg_array :items
    end
    class ::Item < Sequel::Model(@db)
      plugin :pg_array_associations
      pg_array_to_many :foos
    end
    [Foo, Item].each(&:finalize_associations)
    @db.sqls
  end
  after do
    Object.send(:remove_const, :Item)
    Object.send(:remove_const, :Foo)
  end

  it "should finalize pg_array_to_many associations" do
    r = Item.association_reflection(:foos)
    r[:class].must_equal Foo
    r[:_dataset].sql.must_equal "SELECT * FROM foos"
    r[:associated_eager_dataset].sql.must_equal "SELECT * FROM foos"
    r.fetch(:_eager_limit_strategy).must_be_nil
    r[:filter_by_associations_conditions_dataset].sql.must_equal "SELECT array_agg(foos.id) FROM foos WHERE (foos.id IS NOT NULL)"
    r[:predicate_key].must_equal Sequel.qualify(:foos, :id)
    r[:predicate_keys].must_equal [Sequel.qualify(:foos, :id)]
    r[:reciprocal].must_equal :items
    r[:array_type].must_equal :integer
    r[:primary_key].must_equal :id
    r[:primary_key_method].must_equal :id
  end

  it "should finalize many_to_pg_array associations" do
    r = Foo.association_reflection(:items)
    r[:class].must_equal Item
    r[:_dataset].sql.must_equal "SELECT * FROM items"
    r[:associated_eager_dataset].sql.must_equal  "SELECT * FROM items"
    r.fetch(:_eager_limit_strategy).must_be_nil
    r[:filter_by_associations_conditions_dataset].sql.must_equal "SELECT _smtopgaa_key_ FROM items CROSS JOIN unnest(items.foo_ids) AS _smtopgaa_(_smtopgaa_key_) WHERE (items.foo_ids IS NOT NULL)"
    r[:predicate_key].must_equal Sequel.qualify(:items, :foo_ids)
    r[:predicate_keys].must_equal [Sequel.qualify(:items, :foo_ids)]
    r[:reciprocal].must_equal :foos
    r[:array_type].must_equal :integer
  end
end
