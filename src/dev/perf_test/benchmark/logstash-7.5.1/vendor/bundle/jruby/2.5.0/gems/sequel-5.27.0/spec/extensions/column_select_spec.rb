require_relative "spec_helper"

describe "Sequel::Plugins::ColumnSelect" do
  def set_cols(*cols)
    @cols.replace(cols)
  end

  before do
    cols = @cols = []
    @db = Sequel.mock
    @db.extend_datasets(Module.new{define_method(:columns){cols}})
    set_cols :id, :a, :b, :c
    @Album = Class.new(Sequel::Model(@db[:albums]))
  end

  it "should add a explicit column selections to existing dataset without explicit selection" do
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT albums.id, albums.a, albums.b, albums.c FROM albums'

    @Album.dataset = :albs
    @Album.dataset.sql.must_equal 'SELECT albs.id, albs.a, albs.b, albs.c FROM albs'

    @Album.dataset = Sequel.identifier(:albs)
    @Album.dataset.sql.must_equal 'SELECT albs.id, albs.a, albs.b, albs.c FROM albs'
  end

  with_symbol_splitting "should handle splittable symbols" do
    @Album.dataset = :s__albums
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT s.albums.id, s.albums.a, s.albums.b, s.albums.c FROM s.albums'

    @Album.dataset = :albums___a
    @Album.dataset.sql.must_equal 'SELECT a.id, a.a, a.b, a.c FROM albums AS a'

    @Album.dataset = :s__albums___a
    @Album.dataset.sql.must_equal 'SELECT a.id, a.a, a.b, a.c FROM s.albums AS a'
  end

  it "should handle qualified tables" do
    @Album.dataset = Sequel.qualify(:s2, :albums)
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT s2.albums.id, s2.albums.a, s2.albums.b, s2.albums.c FROM s2.albums'
  end

  it "should handle aliases" do
    @Album.plugin :column_select
    @Album.dataset = Sequel.as(:albums, :b)
    @Album.dataset.sql.must_equal 'SELECT b.id, b.a, b.b, b.c FROM albums AS b'

    @Album.dataset = @Album.db[:albums].from_self
    @Album.dataset.sql.must_equal 'SELECT t1.id, t1.a, t1.b, t1.c FROM (SELECT * FROM albums) AS t1'

    @Album.dataset = Sequel.as(@Album.db[:albums], :b)
    @Album.dataset.sql.must_equal 'SELECT b.id, b.a, b.b, b.c FROM (SELECT * FROM albums) AS b'
  end

  it "should not add a explicit column selection selection on existing dataset with explicit selection" do
    @Album.dataset = @Album.dataset.select(:name)
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT name FROM albums'

    @Album.dataset = @Album.dataset.select(:name, :artist)
    @Album.dataset.sql.must_equal 'SELECT name, artist FROM albums'
  end

  it "should work with implicit subqueries used for joined datasets" do
    @Album.dataset = @Album.db.from(:a1, :a2)
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal "SELECT a1.id, a1.a, a1.b, a1.c FROM (SELECT * FROM a1, a2) AS a1"

    @Album.dataset = @Album.db.from(:a1).cross_join(:a2)
    @Album.dataset.sql.must_equal "SELECT a1.id, a1.a, a1.b, a1.c FROM (SELECT * FROM a1 CROSS JOIN a2) AS a1"
  end

  it "should add a explicit column selection on existing dataset with a subquery" do
    @Album.dataset = @Album.db.from(:a1, :a2).from_self(:alias=>:foo)
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT foo.id, foo.a, foo.b, foo.c FROM (SELECT * FROM a1, a2) AS foo'

    @Album.dataset = @Album.db.from(:a1).cross_join(:a2).from_self(:alias=>:foo)
    @Album.dataset.sql.must_equal 'SELECT foo.id, foo.a, foo.b, foo.c FROM (SELECT * FROM a1 CROSS JOIN a2) AS foo'
  end

  it "should use explicit column selection for many_to_many associations" do
    @Album.plugin :column_select
    @Album.many_to_many :albums, :class=>@Album, :left_key=>:l, :right_key=>:r, :join_table=>:j
    @Album.load(:id=>1).albums_dataset.sql.must_equal 'SELECT albums.id, albums.a, albums.b, albums.c FROM albums INNER JOIN j ON (j.r = albums.id) WHERE (j.l = 1)'
  end

  it "should set not explicit column selection for many_to_many associations when overriding select" do
    @Album.plugin :column_select
    @Album.dataset = @Album.dataset.select(:a)
    @Album.many_to_many :albums, :class=>@Album, :left_key=>:l, :right_key=>:r, :join_table=>:j
    @Album.load(:id=>1).albums_dataset.sql.must_equal 'SELECT albums.* FROM albums INNER JOIN j ON (j.r = albums.id) WHERE (j.l = 1)'
  end

  it "should use the schema to get columns if available" do
    def @db.supports_schema_parsing?() true end
    def @db.schema(t, *)
      [[:t, {}], [:d, {}]]
    end
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT albums.t, albums.d FROM albums'
  end

  it "should handle case where schema parsing does not produce results" do
    def @db.supports_schema_parsing?() true end
    def @db.schema_parse_table(t, *) [] end
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT albums.id, albums.a, albums.b, albums.c FROM albums'
  end

  it "should handle case where schema parsing and columns does not produce results" do
    def @db.supports_schema_parsing?() true end
    def @db.schema_parse_table(t, *) [] end
    @db.extend_datasets{def columns; raise Sequel::DatabaseError; end}
    @Album.require_valid_table = false
    @Album.plugin :column_select
    @Album.dataset.sql.must_equal 'SELECT * FROM albums'
  end

  it "works correctly when loaded on model without a dataset" do
    c = Class.new(Sequel::Model)
    c.plugin :column_select
    sc = Class.new(c)
    sc.dataset = @db[:a]
    sc.dataset.sql.must_equal "SELECT a.id, a.a, a.b, a.c FROM a"
  end
end
