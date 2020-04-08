require_relative "spec_helper"

Sequel.extension :pg_array, :pg_array_ops, :pg_hstore, :pg_hstore_ops

describe "Sequel::Postgres::HStoreOp" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @ds = @db.dataset
    @h = Sequel.hstore_op(:h)
  end

  it "#- should use the - operator" do
    @ds.literal(@h - :a).must_equal "(h - a)"
  end

  it "#- should cast String argument to text when using - operator" do
    @ds.literal(@h - 'a').must_equal "(h - CAST('a' AS text))"
  end

  it "#- should not cast LiteralString argument to text when using - operator" do
    @ds.literal(@h - Sequel.lit('a')).must_equal "(h - a)"
  end

  it "#- should handle arrays" do
    @ds.literal(@h - %w'a').must_equal "(h - ARRAY['a'])"
  end

  it "#- should handle hashes" do
    @ds.literal(@h - {'a'=>'b'}).must_equal "(h - '\"a\"=>\"b\"'::hstore)"
  end

  it "#- should return an HStoreOp" do
    @ds.literal((@h - :a)['a']).must_equal "((h - a) -> 'a')"
  end

  it "#[] should use the -> operator" do
    @ds.literal(@h['a']).must_equal "(h -> 'a')"
  end

  it "#[] should handle arrays" do
    @ds.literal(@h[%w'a']).must_equal "(h -> ARRAY['a'])"
  end

  it "#[] should return a PGArrayOp if given an array" do
    @ds.literal(@h[%w'a'][0]).must_equal "((h -> ARRAY['a']))[0]"
  end

  it "#[] should not return a PGArrayOp if given an array but pg_array_op is not supported" do
    begin
      module Sequel::Postgres::HStoreOp::Sequel
        SQL = ::Sequel::SQL
      end
      @ds.literal(@h[%w'a']).wont_be_kind_of(Sequel::Postgres::ArrayOp)
    ensure
      Sequel::Postgres::HStoreOp.send(:remove_const, :Sequel)
    end
  end

  it "#[] should return a PGArrayOp if given a PGArray" do
    @ds.literal(@h[Sequel.pg_array(%w'a')][0]).must_equal "((h -> ARRAY['a']))[0]"
  end

  it "#[] should return a PGArrayOp if given a PGArrayOp" do
    @ds.literal(@h[Sequel.pg_array_op(:a)][0]).must_equal "((h -> a))[0]"
  end

  it "#[] should return a string expression" do
    @ds.literal(@h['a'] + 'b').must_equal "((h -> 'a') || 'b')"
  end

  it "#concat and #merge should use the || operator" do
    @ds.literal(@h.concat(:h1)).must_equal "(h || h1)"
    @ds.literal(@h.merge(:h1)).must_equal "(h || h1)"
  end

  it "#concat and #merge should handle hashes" do
    @ds.literal(@h.concat('a'=>'b')).must_equal "(h || '\"a\"=>\"b\"'::hstore)"
    @ds.literal(@h.merge('a'=>'b')).must_equal "(h || '\"a\"=>\"b\"'::hstore)"
  end

  it "#concat should return an HStoreOp" do
    @ds.literal(@h.concat(:h1)['a']).must_equal "((h || h1) -> 'a')"
  end

  it "#contain_all should use the ?& operator" do
    @ds.literal(@h.contain_all(:h1)).must_equal "(h ?& h1)"
  end

  it "#contain_all handle arrays" do
    @ds.literal(@h.contain_all(%w'h1')).must_equal "(h ?& ARRAY['h1'])"
  end

  it "#contain_any should use the ?| operator" do
    @ds.literal(@h.contain_any(:h1)).must_equal "(h ?| h1)"
  end

  it "#contain_any should handle arrays" do
    @ds.literal(@h.contain_any(%w'h1')).must_equal "(h ?| ARRAY['h1'])"
  end

  it "#contains should use the @> operator" do
    @ds.literal(@h.contains(:h1)).must_equal "(h @> h1)"
  end

  it "#contains should handle hashes" do
    @ds.literal(@h.contains('a'=>'b')).must_equal "(h @> '\"a\"=>\"b\"'::hstore)"
  end

  it "#contained_by should use the <@ operator" do
    @ds.literal(@h.contained_by(:h1)).must_equal "(h <@ h1)"
  end

  it "#contained_by should handle hashes" do
    @ds.literal(@h.contained_by('a'=>'b')).must_equal "(h <@ '\"a\"=>\"b\"'::hstore)"
  end

  it "#defined should use the defined function" do
    @ds.literal(@h.defined('a')).must_equal "defined(h, 'a')"
  end

  it "#delete should use the delete function" do
    @ds.literal(@h.delete('a')).must_equal "delete(h, 'a')"
  end

  it "#delete should handle arrays" do
    @ds.literal(@h.delete(%w'a')).must_equal "delete(h, ARRAY['a'])"
  end

  it "#delete should handle hashes" do
    @ds.literal(@h.delete('a'=>'b')).must_equal "delete(h, '\"a\"=>\"b\"'::hstore)"
  end

  it "#delete should return an HStoreOp" do
    @ds.literal(@h.delete('a')['a']).must_equal "(delete(h, 'a') -> 'a')"
  end

  it "#each should use the each function" do
    @ds.literal(@h.each).must_equal "each(h)"
  end

  it "#has_key? and aliases should use the ? operator" do
    @ds.literal(@h.has_key?('a')).must_equal "(h ? 'a')"
    @ds.literal(@h.key?('a')).must_equal "(h ? 'a')"
    @ds.literal(@h.member?('a')).must_equal "(h ? 'a')"
    @ds.literal(@h.include?('a')).must_equal "(h ? 'a')"
    @ds.literal(@h.exist?('a')).must_equal "(h ? 'a')"
  end

  it "#hstore should return the receiver" do
    @h.hstore.must_be_same_as(@h)
  end

  it "#keys and #akeys should use the akeys function" do
    @ds.literal(@h.keys).must_equal "akeys(h)"
    @ds.literal(@h.akeys).must_equal "akeys(h)"
  end

  it "#keys and #akeys should return PGArrayOps" do
    @ds.literal(@h.keys[0]).must_equal "(akeys(h))[0]"
    @ds.literal(@h.akeys[0]).must_equal "(akeys(h))[0]"
  end

  it "#populate should use the populate_record function" do
    @ds.literal(@h.populate(:a)).must_equal "populate_record(a, h)"
  end

  it "#record_set should use the #= operator" do
    @ds.literal(@h.record_set(:a)).must_equal "(a #= h)"
  end

  it "#skeys should use the skeys function" do
    @ds.literal(@h.skeys).must_equal "skeys(h)"
  end

  it "#slice should should use the slice function" do
    @ds.literal(@h.slice(:a)).must_equal "slice(h, a)"
  end

  it "#slice should handle arrays" do
    @ds.literal(@h.slice(%w'a')).must_equal "slice(h, ARRAY['a'])"
  end

  it "#slice should return an HStoreOp" do
    @ds.literal(@h.slice(:a)['a']).must_equal "(slice(h, a) -> 'a')"
  end

  it "#svals should use the svals function" do
    @ds.literal(@h.svals).must_equal "svals(h)"
  end

  it "#to_array should use the hstore_to_array function" do
    @ds.literal(@h.to_array).must_equal "hstore_to_array(h)"
  end

  it "#to_array should return a PGArrayOp" do
    @ds.literal(@h.to_array[0]).must_equal "(hstore_to_array(h))[0]"
  end

  it "#to_matrix should use the hstore_to_matrix function" do
    @ds.literal(@h.to_matrix).must_equal "hstore_to_matrix(h)"
  end

  it "#to_matrix should return a PGArrayOp" do
    @ds.literal(@h.to_matrix[0]).must_equal "(hstore_to_matrix(h))[0]"
  end

  it "#values and #avals should use the avals function" do
    @ds.literal(@h.values).must_equal "avals(h)"
    @ds.literal(@h.avals).must_equal "avals(h)"
  end

  it "#values and #avals should return PGArrayOps" do
    @ds.literal(@h.values[0]).must_equal "(avals(h))[0]"
    @ds.literal(@h.avals[0]).must_equal "(avals(h))[0]"
  end

  it "should have Sequel.hstore_op return HStoreOp instances as-is" do
    Sequel.hstore_op(@h).must_be_same_as(@h)
  end

  it "should have Sequel.hstore return HStoreOp instances" do
    Sequel.hstore(:h).must_equal @h
  end

  it "should be able to turn expressions into hstore ops using hstore" do
    @ds.literal(Sequel.qualify(:b, :a).hstore['a']).must_equal "(b.a -> 'a')"
    @ds.literal(Sequel.function(:a, :b).hstore['a']).must_equal "(a(b) -> 'a')"
  end

  it "should be able to turn literal strings into hstore ops using hstore" do
    @ds.literal(Sequel.lit('a').hstore['a']).must_equal "(a -> 'a')"
  end

  it "should allow transforming HStore instances into HStoreOp instances" do
    @ds.literal(Sequel.hstore('a'=>'b').op['a']).must_equal "('\"a\"=>\"b\"'::hstore -> 'a')"
  end
end
