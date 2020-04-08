require_relative "spec_helper"

Sequel.extension :pg_array, :pg_array_ops, :pg_json, :pg_json_ops

describe "Sequel::Postgres::JSONOp" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @j = Sequel.pg_json_op(:j)
    @jb = Sequel.pg_jsonb_op(:j)
    @l = proc{|o| @db.literal(o)}
  end

  it "should have #[] get the element" do
    @l[@j[1]].must_equal "(j -> 1)"
    @l[@j['a']].must_equal "(j -> 'a')"
  end

  it "should have #[] accept an array" do
    @l[@j[%w'a b']].must_equal "(j #> ARRAY['a','b'])"
    @l[@j[Sequel.pg_array(%w'a b')]].must_equal "(j #> ARRAY['a','b'])"
    @l[@j[Sequel.pg_array(:a)]].must_equal "(j #> a)"
  end

  it "should have #[] return an object of the same class" do
    @l[@j[1].to_recordset].must_equal "json_to_recordset((j -> 1))"
    @l[@j[%w'a b'][2]].must_equal "((j #> ARRAY['a','b']) -> 2)"
    @l[@jb[1].to_recordset].must_equal "jsonb_to_recordset((j -> 1))"
    @l[@jb[%w'a b'][2]].must_equal "((j #> ARRAY['a','b']) -> 2)"
  end

  it "should have #get be an alias to #[]" do
    @l[@j.get(1)].must_equal "(j -> 1)"
    @l[@j.get(%w'a b')].must_equal "(j #> ARRAY['a','b'])"
  end

  it "should have #get_text get the element as text" do
    @l[@j.get_text(1)].must_equal "(j ->> 1)"
    @l[@j.get_text('a')].must_equal "(j ->> 'a')"
  end

  it "should have #get_text accept an array" do
    @l[@j.get_text(%w'a b')].must_equal "(j #>> ARRAY['a','b'])"
    @l[@j.get_text(Sequel.pg_array(%w'a b'))].must_equal "(j #>> ARRAY['a','b'])"
    @l[@j.get_text(Sequel.pg_array(:a))].must_equal "(j #>> a)"
  end

  it "should have #get_text return an SQL::StringExpression" do
    @l[@j.get_text(1) + 'a'].must_equal "((j ->> 1) || 'a')"
    @l[@j.get_text(%w'a b') + 'a'].must_equal "((j #>> ARRAY['a','b']) || 'a')"
  end

  it "should have #array_length use the json_array_length function" do
    @l[@j.array_length].must_equal "json_array_length(j)"
    @l[@jb.array_length].must_equal "jsonb_array_length(j)"
  end

  it "should have #array_length return a numeric expression" do
    @l[@j.array_length & 1].must_equal "(json_array_length(j) & 1)"
    @l[@jb.array_length & 1].must_equal "(jsonb_array_length(j) & 1)"
  end

  it "should have #each use the json_each function" do
    @l[@j.each].must_equal "json_each(j)"
    @l[@jb.each].must_equal "jsonb_each(j)"
  end

  it "should have #each_text use the json_each_text function" do
    @l[@j.each_text].must_equal "json_each_text(j)"
    @l[@jb.each_text].must_equal "jsonb_each_text(j)"
  end

  it "should have #extract use the json_extract_path function" do
    @l[@j.extract('a')].must_equal "json_extract_path(j, 'a')"
    @l[@j.extract('a', 'b')].must_equal "json_extract_path(j, 'a', 'b')"
    @l[@jb.extract('a')].must_equal "jsonb_extract_path(j, 'a')"
    @l[@jb.extract('a', 'b')].must_equal "jsonb_extract_path(j, 'a', 'b')"
  end

  it "should have #extract return a JSONOp" do
    @l[@j.extract('a')[1]].must_equal "(json_extract_path(j, 'a') -> 1)"
    @l[@jb.extract('a')[1]].must_equal "(jsonb_extract_path(j, 'a') -> 1)"
  end

  it "should have #extract_text use the json_extract_path_text function" do
    @l[@j.extract_text('a')].must_equal "json_extract_path_text(j, 'a')"
    @l[@j.extract_text('a', 'b')].must_equal "json_extract_path_text(j, 'a', 'b')"
    @l[@jb.extract_text('a')].must_equal "jsonb_extract_path_text(j, 'a')"
    @l[@jb.extract_text('a', 'b')].must_equal "jsonb_extract_path_text(j, 'a', 'b')"
  end

  it "should have #extract_text return an SQL::StringExpression" do
    @l[@j.extract_text('a') + 'a'].must_equal "(json_extract_path_text(j, 'a') || 'a')"
    @l[@jb.extract_text('a') + 'a'].must_equal "(jsonb_extract_path_text(j, 'a') || 'a')"
  end

  it "should have #keys use the json_object_keys function" do
    @l[@j.keys].must_equal "json_object_keys(j)"
    @l[@jb.keys].must_equal "jsonb_object_keys(j)"
  end

  it "should have #array_elements use the json_array_elements function" do
    @l[@j.array_elements].must_equal "json_array_elements(j)"
    @l[@jb.array_elements].must_equal "jsonb_array_elements(j)"
  end

  it "should have #array_elements use the json_array_elements_text function" do
    @l[@j.array_elements_text].must_equal "json_array_elements_text(j)"
    @l[@jb.array_elements_text].must_equal "jsonb_array_elements_text(j)"
  end

  it "should have #strip_nulls use the json_strip_nulls function" do
    @l[@j.strip_nulls].must_equal "json_strip_nulls(j)"
    @l[@jb.strip_nulls].must_equal "jsonb_strip_nulls(j)"
  end

  it "should have #typeof use the json_typeof function" do
    @l[@j.typeof].must_equal "json_typeof(j)"
    @l[@jb.typeof].must_equal "jsonb_typeof(j)"
  end

  it "should have #to_record use the json_to_record function" do
    @l[@j.to_record].must_equal "json_to_record(j)"
    @l[@jb.to_record].must_equal "jsonb_to_record(j)"
  end

  it "should have #to_recordset use the json_to_recordsetfunction" do
    @l[@j.to_recordset].must_equal "json_to_recordset(j)"
    @l[@jb.to_recordset].must_equal "jsonb_to_recordset(j)"
  end

  it "should have #populate use the json_populate_record function" do
    @l[@j.populate(:a)].must_equal "json_populate_record(a, j)"
    @l[@jb.populate(:a)].must_equal "jsonb_populate_record(a, j)"
  end

  it "should have #populate_set use the json_populate_record function" do
    @l[@j.populate_set(:a)].must_equal "json_populate_recordset(a, j)"
    @l[@jb.populate_set(:a)].must_equal "jsonb_populate_recordset(a, j)"
  end

  it "#contain_all should use the ?& operator" do
    @l[@jb.contain_all(:h1)].must_equal "(j ?& h1)"
  end

  it "#contain_all handle arrays" do
    @l[@jb.contain_all(%w'h1')].must_equal "(j ?& ARRAY['h1'])"
  end

  it "#contain_any should use the ?| operator" do
    @l[@jb.contain_any(:h1)].must_equal "(j ?| h1)"
  end

  it "#contain_any should handle arrays" do
    @l[@jb.contain_any(%w'h1')].must_equal "(j ?| ARRAY['h1'])"
  end

  it "#contains should use the @> operator" do
    @l[@jb.contains(:h1)].must_equal "(j @> h1)"
  end

  it "#contains should handle hashes" do
    @l[@jb.contains('a'=>'b')].must_equal "(j @> '{\"a\":\"b\"}'::jsonb)"
  end

  it "#contains should handle arrays" do
    @l[@jb.contains([1, 2])].must_equal "(j @> '[1,2]'::jsonb)"
  end

  it "#contained_by should use the <@ operator" do
    @l[@jb.contained_by(:h1)].must_equal "(j <@ h1)"
  end

  it "#contained_by should handle hashes" do
    @l[@jb.contained_by('a'=>'b')].must_equal "(j <@ '{\"a\":\"b\"}'::jsonb)"
  end

  it "#contained_by should handle arrays" do
    @l[@jb.contained_by([1, 2])].must_equal "(j <@ '[1,2]'::jsonb)"
  end

  it "#concat should use the || operator" do
    @l[@jb.concat(:h1)].must_equal "(j || h1)"
  end

  it "#concat should handle hashes" do
    @l[@jb.concat('a'=>'b')].must_equal "(j || '{\"a\":\"b\"}'::jsonb)"
  end

  it "#concat should handle arrays" do
    @l[@jb.concat([1, 2])].must_equal "(j || '[1,2]'::jsonb)"
  end

  it "#insert should use the jsonb_insert function" do
    @l[@jb.insert(:a, :h)].must_equal "jsonb_insert(j, a, h, false)"
    @l[@jb.insert(:a, :h, true)].must_equal "jsonb_insert(j, a, h, true)"
  end

  it "#insert should handle hashes" do
    @l[@jb.insert(:a, 'a'=>'b')].must_equal "jsonb_insert(j, a, '{\"a\":\"b\"}'::jsonb, false)"
  end

  it "#insert should handle arrays" do
    @l[@jb.insert(%w'a b', [1, 2])].must_equal "jsonb_insert(j, ARRAY['a','b'], '[1,2]'::jsonb, false)"
  end

  it "#set should use the jsonb_set function" do
    @l[@jb.set(:a, :h)].must_equal "jsonb_set(j, a, h, true)"
    @l[@jb.set(:a, :h, false)].must_equal "jsonb_set(j, a, h, false)"
  end

  it "#set should handle hashes" do
    @l[@jb.set(:a, 'a'=>'b')].must_equal "jsonb_set(j, a, '{\"a\":\"b\"}'::jsonb, true)"
  end

  it "#set should handle arrays" do
    @l[@jb.set(%w'a b', [1, 2])].must_equal "jsonb_set(j, ARRAY['a','b'], '[1,2]'::jsonb, true)"
  end

  it "#pretty should use the jsonb_pretty function" do
    @l[@jb.pretty].must_equal "jsonb_pretty(j)"
  end

  it "#- should use the - operator" do
    @l[@jb - 1].must_equal "(j - 1)"
  end

  it "#delete_path should use the #- operator" do
    @l[@jb.delete_path(:a)].must_equal "(j #- a)"
  end

  it "#delete_path should handle arrays" do
    @l[@jb.delete_path(['a'])].must_equal "(j #- ARRAY['a'])"
  end

  it "#has_key? and aliases should use the ? operator" do
    @l[@jb.has_key?('a')].must_equal "(j ? 'a')"
    @l[@jb.include?('a')].must_equal "(j ? 'a')"
  end

  it "#pg_json should return self" do
    @j.pg_json.must_be_same_as(@j)
    @jb.pg_jsonb.must_be_same_as(@jb)
  end

  it "Sequel.pg_json_op should return arg for JSONOp" do
    Sequel.pg_json_op(@j).must_be_same_as(@j)
    Sequel.pg_jsonb_op(@jb).must_be_same_as(@jb)
  end

  it "should be able to turn expressions into json ops using pg_json" do
    @db.literal(Sequel.qualify(:b, :a).pg_json[1]).must_equal "(b.a -> 1)"
    @db.literal(Sequel.function(:a, :b).pg_json[1]).must_equal "(a(b) -> 1)"
    @db.literal(Sequel.qualify(:b, :a).pg_jsonb[1]).must_equal "(b.a -> 1)"
    @db.literal(Sequel.function(:a, :b).pg_jsonb[1]).must_equal "(a(b) -> 1)"
  end

  it "should be able to turn literal strings into json ops using pg_json" do
    @db.literal(Sequel.lit('a').pg_json[1]).must_equal "(a -> 1)"
    @db.literal(Sequel.lit('a').pg_jsonb[1]).must_equal "(a -> 1)"
  end

  it "should be able to turn symbols into json ops using Sequel.pg_json_op" do
    @db.literal(Sequel.pg_json_op(:a)[1]).must_equal "(a -> 1)"
    @db.literal(Sequel.pg_jsonb_op(:a)[1]).must_equal "(a -> 1)"
  end

  it "should be able to turn symbols into json ops using Sequel.pg_json" do
    @db.literal(Sequel.pg_json(:a)[1]).must_equal "(a -> 1)"
    @db.literal(Sequel.pg_jsonb(:a)[1]).must_equal "(a -> 1)"
    @db.literal(Sequel.pg_jsonb(:a).contains('a'=>1)).must_equal "(a @> '{\"a\":1}'::jsonb)"
  end

  it "should allow transforming JSONArray instances into ArrayOp instances" do
    @db.literal(Sequel.pg_json([1,2]).op[1]).must_equal "('[1,2]'::json -> 1)"
  end

  it "should allow transforming JSONHash instances into ArrayOp instances" do
    @db.literal(Sequel.pg_json('a'=>1).op['a']).must_equal "('{\"a\":1}'::json -> 'a')"
  end

  it "should allow transforming JSONBArray instances into ArrayOp instances" do
    @db.literal(Sequel.pg_jsonb([1,2]).op[1]).must_equal "('[1,2]'::jsonb -> 1)"
  end

  it "should allow transforming JSONBHash instances into ArrayOp instances" do
    @db.literal(Sequel.pg_jsonb('a'=>1).op['a']).must_equal "('{\"a\":1}'::jsonb -> 'a')"
  end

  it "#path_exists should use the @? operator" do
    @l[@jb.path_exists('$')].must_equal "(j @? '$')"
  end

  it "#path_exists result should be a boolean expression" do
    @jb.path_exists('$').must_be_kind_of Sequel::SQL::BooleanExpression
  end

  it "#path_match should use the @@ operator" do
    @l[@jb.path_match('$')].must_equal "(j @@ '$')"
  end

  it "#path_match result should be a boolean expression" do
    @jb.path_match('$').must_be_kind_of Sequel::SQL::BooleanExpression
  end

  it "#path_exists! should use the jsonb_path_exists function" do
    @l[@jb.path_exists!('$')].must_equal "jsonb_path_exists(j, '$')"
    @l[@jb.path_exists!('$', '{"x":2}')].must_equal "jsonb_path_exists(j, '$', '{\"x\":2}')"
    @l[@jb.path_exists!('$', x: 2)].must_equal "jsonb_path_exists(j, '$', '{\"x\":2}')"
    @l[@jb.path_exists!('$', {x: 2}, true)].must_equal "jsonb_path_exists(j, '$', '{\"x\":2}', true)"
  end

  it "#path_exists! result should be a boolean expression" do
    @jb.path_exists!('$').must_be_kind_of Sequel::SQL::BooleanExpression
  end

  it "#path_match! should use the jsonb_path_match function" do
    @l[@jb.path_match!('$')].must_equal "jsonb_path_match(j, '$')"
    @l[@jb.path_match!('$', '{"x":2}')].must_equal "jsonb_path_match(j, '$', '{\"x\":2}')"
    @l[@jb.path_match!('$', x: 2)].must_equal "jsonb_path_match(j, '$', '{\"x\":2}')"
    @l[@jb.path_match!('$', {x: 2}, true)].must_equal "jsonb_path_match(j, '$', '{\"x\":2}', true)"
  end

  it "#path_match! result should be a boolean expression" do
    @jb.path_match!('$').must_be_kind_of Sequel::SQL::BooleanExpression
  end

  it "#path_query should use the jsonb_path_query function" do
    @l[@jb.path_query('$')].must_equal "jsonb_path_query(j, '$')"
    @l[@jb.path_query('$', '{"x":2}')].must_equal "jsonb_path_query(j, '$', '{\"x\":2}')"
    @l[@jb.path_query('$', x: 2)].must_equal "jsonb_path_query(j, '$', '{\"x\":2}')"
    @l[@jb.path_query('$', {x: 2}, true)].must_equal "jsonb_path_query(j, '$', '{\"x\":2}', true)"
  end

  it "#path_query_array should use the jsonb_path_query_array function" do
    @l[@jb.path_query_array('$')].must_equal "jsonb_path_query_array(j, '$')"
    @l[@jb.path_query_array('$', '{"x":2}')].must_equal "jsonb_path_query_array(j, '$', '{\"x\":2}')"
    @l[@jb.path_query_array('$', x: 2)].must_equal "jsonb_path_query_array(j, '$', '{\"x\":2}')"
    @l[@jb.path_query_array('$', {x: 2}, true)].must_equal "jsonb_path_query_array(j, '$', '{\"x\":2}', true)"
  end

  it "#path_query_array result should be a JSONBOp" do
    @l[@jb.path_query_array('$').path_query_array('$')].must_equal "jsonb_path_query_array(jsonb_path_query_array(j, '$'), '$')"
  end

  it "#path_query_first should use the jsonb_path_query_first function" do
    @l[@jb.path_query_first('$')].must_equal "jsonb_path_query_first(j, '$')"
    @l[@jb.path_query_first('$', '{"x":2}')].must_equal "jsonb_path_query_first(j, '$', '{\"x\":2}')"
    @l[@jb.path_query_first('$', x: 2)].must_equal "jsonb_path_query_first(j, '$', '{\"x\":2}')"
    @l[@jb.path_query_first('$', {x: 2}, true)].must_equal "jsonb_path_query_first(j, '$', '{\"x\":2}', true)"
  end

  it "#path_query_first result should be a JSONBOp" do
    @l[@jb.path_query_first('$').path_query_first('$')].must_equal "jsonb_path_query_first(jsonb_path_query_first(j, '$'), '$')"
  end
end
