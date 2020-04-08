require_relative "spec_helper"

Sequel.extension :pg_array, :pg_array_ops, :pg_hstore, :pg_hstore_ops

describe "Sequel::Postgres::ArrayOp" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @a = Sequel.pg_array_op(:a)
  end

  it "should support the standard mathematical operators" do
    @db.literal(@a < @a).must_equal "(a < a)"
    @db.literal(@a <= @a).must_equal "(a <= a)"
    @db.literal(@a > @a).must_equal "(a > a)"
    @db.literal(@a >= @a).must_equal "(a >= a)"
  end

  it "#[] should support subscript access" do
    @db.literal(@a[1]).must_equal "(a)[1]"
    @db.literal(@a[1][2]).must_equal "(a)[1][2]"
  end

  it "#[] with a range should return an ArrayOp" do
    @db.literal(@a[1..2].any).must_equal "ANY((a)[1:2])"
  end

  it "#any should use the ANY method" do
    @db.literal(1=>@a.any).must_equal "(1 = ANY(a))"
  end

  it "#all should use the ALL method" do
    @db.literal(1=>@a.all).must_equal "(1 = ALL(a))"
  end

  it "#contains should use the @> operator" do
    @db.literal(@a.contains(:b)).must_equal "(a @> b)"
  end

  it "#contained_by should use the <@ operator" do
    @db.literal(@a.contained_by(:b)).must_equal "(a <@ b)"
  end

  it "#overlaps should use the && operator" do
    @db.literal(@a.overlaps(:b)).must_equal "(a && b)"
  end

  it "#push/concat should use the || operator in append mode" do
    @db.literal(@a.push(:b)).must_equal "(a || b)"
    @db.literal(@a.concat(:b)).must_equal "(a || b)"
  end

  it "#remove should remove the element from the array" do
    @db.literal(@a.remove(1)).must_equal "array_remove(a, 1)"
    @db.literal(@a.remove(1)[2]).must_equal "(array_remove(a, 1))[2]"
  end

  it "#remove should replace the element in the array with another" do
    @db.literal(@a.replace(1, 2)).must_equal "array_replace(a, 1, 2)"
    @db.literal(@a.replace(1, 2)[3]).must_equal "(array_replace(a, 1, 2))[3]"
  end

  it "#unshift should use the || operator in prepend mode" do
    @db.literal(@a.unshift(:b)).must_equal "(b || a)"
  end

  it "#cardinality should use the cardinality function" do
    @db.literal(@a.cardinality).must_equal "cardinality(a)"
  end

  it "#dims should use the array_dims function" do
    @db.literal(@a.dims).must_equal "array_dims(a)"
  end

  it "#length should use the array_length function" do
    @db.literal(@a.length).must_equal "array_length(a, 1)"
    @db.literal(@a.length(2)).must_equal "array_length(a, 2)"
  end

  it "#length should use the array_lower function" do
    @db.literal(@a.lower).must_equal "array_lower(a, 1)"
    @db.literal(@a.lower(2)).must_equal "array_lower(a, 2)"
  end

  it "#to_string/join should use the array_to_string function" do
    @db.literal(@a.to_string).must_equal "array_to_string(a, '')"
    @db.literal(@a.join).must_equal "array_to_string(a, '')"
    @db.literal(@a.join(':')).must_equal "array_to_string(a, ':')"
    @db.literal(@a.join(':', '*')).must_equal "array_to_string(a, ':', '*')"
  end

  it "#hstore should convert the item to an hstore using the hstore function" do
    @db.literal(@a.hstore).must_equal "hstore(a)"
    @db.literal(@a.hstore['a']).must_equal "(hstore(a) -> 'a')"
    @db.literal(@a.hstore(:b)).must_equal "hstore(a, b)"
    @db.literal(@a.hstore(:b)['a']).must_equal "(hstore(a, b) -> 'a')"
    @db.literal(@a.hstore(%w'1')).must_equal "hstore(a, ARRAY['1'])"
    @db.literal(@a.hstore(%w'1')['a']).must_equal "(hstore(a, ARRAY['1']) -> 'a')"
  end

  it "#unnest should use the unnest function" do
    @db.literal(@a.unnest).must_equal "unnest(a)"
    @db.literal(@a.unnest(:b, :c)).must_equal "unnest(a, b, c)"
    @db.literal(@a.unnest([1])).must_equal "unnest(a, ARRAY[1])"
  end

  it "#pg_array should return self" do
    @a.pg_array.must_be_same_as(@a)
  end

  it "Sequel.pg_array_op should return arg for ArrayOp" do
    Sequel.pg_array_op(@a).must_be_same_as(@a)
  end

  it "should be able to turn expressions into array ops using pg_array" do
    @db.literal(Sequel.qualify(:b, :a).pg_array.push(3)).must_equal "(b.a || 3)"
    @db.literal(Sequel.function(:a, :b).pg_array.push(3)).must_equal "(a(b) || 3)"
  end

  it "should be able to turn literal strings into array ops using pg_array" do
    @db.literal(Sequel.lit('a').pg_array.unnest).must_equal "unnest(a)"
  end

  it "should be able to turn symbols into array ops using Sequel.pg_array_op" do
    @db.literal(Sequel.pg_array_op(:a).unnest).must_equal "unnest(a)"
  end

  it "should be able to turn symbols into array ops using Sequel.pg_array" do
    @db.literal(Sequel.pg_array(:a).unnest).must_equal "unnest(a)"
  end

  it "should allow transforming PGArray instances into ArrayOp instances" do
    @db.literal(Sequel.pg_array([1,2]).op.push(3)).must_equal "(ARRAY[1,2] || 3)"
  end

  it "should wrap array arguments in PGArrays" do
    @db.literal(@a.contains([1, 2])).must_equal "(a @> ARRAY[1,2])"
    @db.literal(@a.contained_by([1, 2])).must_equal "(a <@ ARRAY[1,2])"
    @db.literal(@a.overlaps([1, 2])).must_equal "(a && ARRAY[1,2])"
    @db.literal(@a.push([1, 2])).must_equal "(a || ARRAY[1,2])"
    @db.literal(@a.concat([1, 2])).must_equal "(a || ARRAY[1,2])"
    @db.literal(@a.unshift([1, 2])).must_equal "(ARRAY[1,2] || a)"
  end
end
