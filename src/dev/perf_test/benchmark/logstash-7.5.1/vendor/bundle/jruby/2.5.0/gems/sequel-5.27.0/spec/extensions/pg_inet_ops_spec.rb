require_relative "spec_helper"

Sequel.extension :pg_inet_ops

describe "Sequel::Postgres::InetOp" do
  before do
    db = Sequel.connect('mock://postgres')
    db.extend_datasets{def quote_identifiers?; false end}
    db.extension :pg_inet
    @ds = db.dataset
    @h = Sequel.pg_inet_op(:h)
  end

  it "#pg_inet should return self" do
    @h.pg_inet.must_be_same_as(@h)
  end

  it "Sequel.pg_inet_op should return argument if already an InetOp" do
    Sequel.pg_inet_op(@h).must_be_same_as(@h)
  end

  it "#pg_inet should return a InetOp for literal strings, and expressions" do
    @ds.literal(Sequel.function(:b, :h).pg_inet.abbrev).must_equal "abbrev(b(h))"
    @ds.literal(Sequel.lit('h').pg_inet.abbrev).must_equal "abbrev(h)"
  end

  it "should define methods for all of the PostgreSQL inet operators" do
    @ds.literal(@h + @h).must_equal "(h + h)"
    @ds.literal(@h - @h).must_equal "(h - h)"
    @ds.literal(@h << @h).must_equal "(h << h)"
    @ds.literal(@h >> @h).must_equal "(h >> h)"
    @ds.literal(@h & @h).must_equal "(h & h)"
    @ds.literal(@h | @h).must_equal "(h | h)"
    @ds.literal(~@h).must_equal "~h"

    @ds.literal(@h.contained_by(@h)).must_equal "(h << h)"
    @ds.literal(@h.contained_by_or_equals(@h)).must_equal "(h <<= h)"
    @ds.literal(@h.contains(@h)).must_equal "(h >> h)"
    @ds.literal(@h.contains_or_equals(@h)).must_equal "(h >>= h)"
    @ds.literal(@h.contains_or_contained_by(@h)).must_equal "(h && h)"
  end

  it "should define methods for all of the PostgreSQL inet functions" do
    @ds.literal(@h.abbrev).must_equal "abbrev(h)"
    @ds.literal(@h.broadcast).must_equal "broadcast(h)"
    @ds.literal(@h.family).must_equal "family(h)"
    @ds.literal(@h.host).must_equal "host(h)"
    @ds.literal(@h.hostmask).must_equal "hostmask(h)"
    @ds.literal(@h.masklen).must_equal "masklen(h)"
    @ds.literal(@h.netmask).must_equal "netmask(h)"
    @ds.literal(@h.network).must_equal "network(h)"
    @ds.literal(@h.set_masklen(16)).must_equal "set_masklen(h, 16)"
    @ds.literal(@h.text).must_equal "text(h)"
  end

  it "should have operators that return booleans return boolean expressions" do
    @ds.literal((@h << @h) & :b).must_equal "((h << h) AND b)"
    @ds.literal((@h >> @h) & :b).must_equal "((h >> h) AND b)"

    @ds.literal(@h.contained_by(@h) & :b).must_equal "((h << h) AND b)"
    @ds.literal(@h.contained_by_or_equals(@h) & :b).must_equal "((h <<= h) AND b)"
    @ds.literal(@h.contains(@h) & :b).must_equal "((h >> h) AND b)"
    @ds.literal(@h.contains_or_equals(@h) & :b).must_equal "((h >>= h) AND b)"
    @ds.literal(@h.contains_or_contained_by(@h) & :b).must_equal "((h && h) AND b)"
  end

  it "should have operators that return inet return InetOp" do
    @ds.literal((@h & @h).contains(:b)).must_equal "((h & h) >> b)"
    @ds.literal((@h | @h).contains(:b)).must_equal "((h | h) >> b)"
    @ds.literal((@h + @h).contains(:b)).must_equal "((h + h) >> b)"
    @ds.literal((@h - 3).contains(:b)).must_equal "((h - 3) >> b)"
    @ds.literal((~@h).contains(:b)).must_equal "(~h >> b)"
  end

  it "should have - operator with inet op return numeric expression" do
    @ds.literal((@h - @h) / :b).must_equal "((h - h) / b)"
  end

  it "should have function methods returning int return numeric expressions" do
    @ds.literal(@h.family / 2).must_equal "(family(h) / 2)"
    @ds.literal(@h.masklen / 2).must_equal "(masklen(h) / 2)"
  end

  it "should have function methods returning text return string expressions" do
    @ds.literal(@h.abbrev + :a).must_equal "(abbrev(h) || a)"
    @ds.literal(@h.host + :a).must_equal "(host(h) || a)"
    @ds.literal(@h.text + :a).must_equal "(text(h) || a)"
  end

  it "should have function methods returning inet return InetOp" do
    @ds.literal(@h.broadcast.contains(:a)).must_equal "(broadcast(h) >> a)"
    @ds.literal(@h.hostmask.contains(:a)).must_equal "(hostmask(h) >> a)"
    @ds.literal(@h.netmask.contains(:a)).must_equal "(netmask(h) >> a)"
    @ds.literal(@h.network.contains(:a)).must_equal "(network(h) >> a)"
    @ds.literal(@h.set_masklen(16).contains(:a)).must_equal "(set_masklen(h, 16) >> a)"
  end

  it "should string and IPAddr instances in a cast to inet" do
    @ds.literal(Sequel.pg_inet_op('1.2.3.4').contains(:a)).must_equal "(CAST('1.2.3.4' AS inet) >> a)"
    @ds.literal(Sequel.pg_inet_op(IPAddr.new('1.2.3.4')).contains(:a)).must_equal "(CAST('1.2.3.4/32' AS inet) >> a)"
  end
end
