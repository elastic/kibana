require_relative "spec_helper"

describe "escaped_like extension" do
  before do
    Sequel.extension(:escaped_like)
    @ds = Sequel.mock[:t]
    @c = Sequel[:c]
  end

  it "escaped_like should support creating case sensitive pattern matches" do
    @ds.where(@c.escaped_like('?', 'a')).sql.must_equal "SELECT * FROM t WHERE (c LIKE 'a' ESCAPE '\\')"
    @ds.where(@c.escaped_like('?%', 'a')).sql.must_equal "SELECT * FROM t WHERE (c LIKE 'a%' ESCAPE '\\')"
    @ds.where(@c.escaped_like('?', 'a%')).sql.must_equal "SELECT * FROM t WHERE (c LIKE 'a\\%' ESCAPE '\\')"
    @ds.where(@c.escaped_like('?', ['a%'])).sql.must_equal "SELECT * FROM t WHERE (c LIKE 'a\\%' ESCAPE '\\')"
    @ds.where(@c.escaped_like('??', ['a', '%'])).sql.must_equal "SELECT * FROM t WHERE (c LIKE 'a\\%' ESCAPE '\\')"
  end

  it "escaped_ilike should support creating case insensitive pattern matches" do
    @ds.where(@c.escaped_ilike('?', 'a')).sql.must_equal "SELECT * FROM t WHERE (UPPER(c) LIKE UPPER('a') ESCAPE '\\')"
    @ds.where(@c.escaped_ilike('?%', 'a')).sql.must_equal "SELECT * FROM t WHERE (UPPER(c) LIKE UPPER('a%') ESCAPE '\\')"
    @ds.where(@c.escaped_ilike('?', 'a%')).sql.must_equal "SELECT * FROM t WHERE (UPPER(c) LIKE UPPER('a\\%') ESCAPE '\\')"
    @ds.where(@c.escaped_ilike('?', ['a%'])).sql.must_equal "SELECT * FROM t WHERE (UPPER(c) LIKE UPPER('a\\%') ESCAPE '\\')"
    @ds.where(@c.escaped_ilike('??', ['a', '%'])).sql.must_equal "SELECT * FROM t WHERE (UPPER(c) LIKE UPPER('a\\%') ESCAPE '\\')"
  end

  it "should raise an Error for a mismatched number of placeholders" do
    proc{@ds.where(@c.escaped_like('?', [])).sql}.must_raise Sequel::Error
    proc{@ds.where(@c.escaped_like('??', ['a'])).sql}.must_raise Sequel::Error
    proc{@ds.where(@c.escaped_ilike('', ['a'])).sql}.must_raise Sequel::Error
    proc{@ds.where(@c.escaped_ilike('?', ['a', 'a'])).sql}.must_raise Sequel::Error
  end

  it "escaped_like and escaped_ilike should return expressions" do
    @ds.select(@c.escaped_like('?', 'a').as(:b)).sql.must_equal "SELECT (c LIKE 'a' ESCAPE '\\') AS b FROM t"
    @ds.select(@c.escaped_like('?', 'a').cast(String)).sql.must_equal "SELECT CAST((c LIKE 'a' ESCAPE '\\') AS varchar(255)) FROM t"
    @ds.order(@c.escaped_like('?', 'a').desc).sql.must_equal "SELECT * FROM t ORDER BY (c LIKE 'a' ESCAPE '\\') DESC"
    @ds.where(@c.escaped_like('?', 'a') | @c.escaped_like('?', 'b')).sql.must_equal "SELECT * FROM t WHERE ((c LIKE 'a' ESCAPE '\\') OR (c LIKE 'b' ESCAPE '\\'))"
  end
end

