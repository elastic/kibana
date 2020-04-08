require_relative "spec_helper"

Sequel.extension :pg_array, :pg_range, :pg_range_ops

describe "Sequel::Postgres::RangeOp" do
  before do
    db = Sequel.connect('mock://postgres')
    db.extend_datasets{def quote_identifiers?; false end}
    @ds = db.dataset
    @h = Sequel.pg_range_op(:h)
  end

  it "#pg_range should return self" do
    @h.pg_range.must_be_same_as(@h)
  end

  it "Sequel.pg_range_op should return argument if already a RangeOp" do
    Sequel.pg_range_op(@h).must_be_same_as(@h)
  end

  it "Sequel.pg_range should return a new RangeOp if not given a range" do
    @ds.literal(Sequel.pg_range(:h).lower).must_equal "lower(h)"
  end

  it "#pg_range should return a RangeOp for literal strings, and expressions" do
    @ds.literal(Sequel.function(:b, :h).pg_range.lower).must_equal "lower(b(h))"
    @ds.literal(Sequel.lit('h').pg_range.lower).must_equal "lower(h)"
  end

  it "PGRange#op should return a RangeOp" do
    @ds.literal(Sequel.pg_range(1..2, :numrange).op.lower).must_equal "lower(numrange(1,2,'[]'))"
  end

  it "should define methods for all of the PostgreSQL range operators" do
    @ds.literal(@h.contains(@h)).must_equal "(h @> h)"
    @ds.literal(@h.contained_by(@h)).must_equal "(h <@ h)"
    @ds.literal(@h.overlaps(@h)).must_equal "(h && h)"
    @ds.literal(@h.left_of(@h)).must_equal "(h << h)"
    @ds.literal(@h.right_of(@h)).must_equal "(h >> h)"
    @ds.literal(@h.ends_before(@h)).must_equal "(h &< h)"
    @ds.literal(@h.starts_after(@h)).must_equal "(h &> h)"
    @ds.literal(@h.adjacent_to(@h)).must_equal "(h -|- h)"
  end

  it "should define methods for all of the PostgreSQL range functions" do
    @ds.literal(@h.lower).must_equal "lower(h)"
    @ds.literal(@h.upper).must_equal "upper(h)"
    @ds.literal(@h.isempty).must_equal "isempty(h)"
    @ds.literal(@h.lower_inc).must_equal "lower_inc(h)"
    @ds.literal(@h.upper_inc).must_equal "upper_inc(h)"
    @ds.literal(@h.lower_inf).must_equal "lower_inf(h)"
    @ds.literal(@h.upper_inf).must_equal "upper_inf(h)"
  end

  it "+ - * operators should be defined and return a RangeOp" do
    @ds.literal((@h + @h).lower).must_equal "lower((h + h))"
    @ds.literal((@h * @h).lower).must_equal "lower((h * h))"
    @ds.literal((@h - @h).lower).must_equal "lower((h - h))"
  end
end
