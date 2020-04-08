require_relative "spec_helper"

Sequel.extension :pg_array, :pg_array_ops, :pg_row, :pg_row_ops

describe "Sequel::Postgres::PGRowOp" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @a = Sequel.pg_row_op(:a)
  end

  it "#[] should access members of the composite type" do
    @db.literal(@a[:b]).must_equal "(a).b"
  end

  it "#[] should be chainable" do
    @db.literal(@a[:b][:c]).must_equal "((a).b).c"
  end

  it "#[] should support array access if not given an identifier" do
    @db.literal(@a[:b][1]).must_equal "((a).b)[1]"
  end

  it "#[] should be chainable with array access" do
    @db.literal(@a[1][:b]).must_equal "((a)[1]).b"
  end

  it "#splat should return a splatted argument inside parentheses" do
    @db.literal(@a.splat).must_equal "(a.*)"
  end

  it "#splat(type) should return a splatted argument cast to given type" do
    @db.literal(@a.splat(:b)).must_equal "(a.*)::b"
  end

  it "#splat should not work on an already accessed composite type" do
    proc{@a[:a].splat(:b)}.must_raise(Sequel::Error)
  end

  it "#* should reference all members of the composite type as separate columns if given no arguments" do
    @db.literal(@a.*).must_equal "(a).*"
    @db.literal(@a[:b].*).must_equal "((a).b).*"
  end

  it "#* should use a multiplication operation if any arguments are given" do
    @db.literal(@a.*(1)).must_equal "(a * 1)"
    @db.literal(@a[:b].*(1)).must_equal "((a).b * 1)"
  end

  it "#pg_row should be callable on literal strings" do
    @db.literal(Sequel.lit('a').pg_row[:b]).must_equal "(a).b"
  end

  it "#pg_row should be callable on Sequel expressions" do
    @db.literal(Sequel.function(:a).pg_row[:b]).must_equal "(a()).b"
  end

  it "Sequel.pg_row should work as well if the pg_row extension is loaded" do
    @db.literal(Sequel.pg_row(Sequel.function(:a))[:b]).must_equal "(a()).b"
  end
end
