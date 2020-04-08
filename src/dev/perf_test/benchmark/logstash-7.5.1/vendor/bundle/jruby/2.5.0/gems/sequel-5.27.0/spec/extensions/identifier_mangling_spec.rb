require_relative "spec_helper"

describe "identifier_mangling extension" do
  it "should respect the :quote_identifiers option" do
    db = Sequel::Database.new(:quote_identifiers=>false).extension(:identifier_mangling)
    db.quote_identifiers?.must_equal false
    db = Sequel::Database.new(:quote_identifiers=>true).extension(:identifier_mangling)
    db.quote_identifiers?.must_equal true
  end

  it "should respect the :quote_identifiers setting" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.quote_identifiers?.must_equal true
    db.quote_identifiers = false
    db.quote_identifiers?.must_equal false
  end

  it "should upcase on input and downcase on output by default" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.send(:identifier_input_method_default).must_equal :upcase
    db.send(:identifier_output_method_default).must_equal :downcase
  end

  it "should respect the :identifier_input_method option" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.identifier_input_method.must_equal :upcase
    db.identifier_input_method = nil
    db.identifier_input_method.must_be_nil
    db = Sequel::Database.new(:identifier_input_method=>nil).extension(:identifier_mangling)
    db.identifier_input_method.must_be_nil
    db.identifier_input_method = :downcase
    db.identifier_input_method.must_equal :downcase
    db = Sequel::Database.new(:identifier_input_method=>:upcase).extension(:identifier_mangling)
    db.identifier_input_method.must_equal :upcase
    db.identifier_input_method = nil
    db.identifier_input_method.must_be_nil
  end
  
  it "should respect the :identifier_output_method option" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.identifier_output_method.must_equal :downcase
    db.identifier_output_method = nil
    db.identifier_output_method.must_be_nil
    db = Sequel::Database.new(:identifier_output_method=>nil).extension(:identifier_mangling)
    db.identifier_output_method.must_be_nil
    db.identifier_output_method = :downcase
    db.identifier_output_method.must_equal :downcase
    db = Sequel::Database.new(:identifier_output_method=>:upcase).extension(:identifier_mangling)
    db.identifier_output_method.must_equal :upcase
    db.identifier_output_method = nil
    db.identifier_output_method.must_be_nil
  end

  it "should respect the identifier_input_method_default method if Sequel.identifier_input_method is not called" do
    class Sequel::Database
      @identifier_input_method = nil
    end
    x = Class.new(Sequel::Database){def dataset_class_default; Sequel::Dataset end; def identifier_input_method_default; :downcase end}
    x.new.extension(:identifier_mangling).identifier_input_method.must_equal :downcase
    y = Class.new(Sequel::Database){def dataset_class_default; Sequel::Dataset end; def identifier_input_method_default; :camelize end}
    y.new.extension(:identifier_mangling).identifier_input_method.must_equal :camelize
  end
  
  it "should respect the identifier_output_method_default method if Sequel.identifier_output_method is not called" do
    class Sequel::Database
      @identifier_output_method = nil
    end
    x = Class.new(Sequel::Database){def dataset_class_default; Sequel::Dataset end; def identifier_output_method_default; :upcase end}
    x.new.extension(:identifier_mangling).identifier_output_method.must_equal :upcase
    y = Class.new(Sequel::Database){def dataset_class_default; Sequel::Dataset end; def identifier_output_method_default; :underscore end}
    y.new.extension(:identifier_mangling).identifier_output_method.must_equal :underscore
  end
end

describe "Database#input_identifier_meth" do
  it "should be the input_identifer method of a default dataset for this database" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.identifier_input_method = nil
    db.send(:input_identifier_meth).call(:a).must_equal 'a'
    db.identifier_input_method = :upcase
    db.send(:input_identifier_meth).call(:a).must_equal 'A'
  end
end

describe "Database#output_identifier_meth" do
  it "should be the output_identifer method of a default dataset for this database" do
    db = Sequel::Database.new.extension(:identifier_mangling)
    db.identifier_output_method = nil
    db.send(:output_identifier_meth).call('A').must_equal :A
    db.identifier_output_method = :downcase
    db.send(:output_identifier_meth).call('A').must_equal :a
  end
end

describe "Database#metadata_dataset" do
  it "should be a dataset with the default settings for identifier_mangling" do
    ds = Sequel::Database.new.extension(:identifier_mangling).send(:metadata_dataset)
    ds.literal(:a).must_equal "\"A\""
    ds.send(:output_identifier, 'A').must_equal :a
  end
end

describe "Dataset" do
  before do
    @dataset = Sequel.mock.extension(:identifier_mangling).dataset
  end
  
  it "should get quote_identifiers default from database" do
    db = Sequel::Database.new(:quote_identifiers=>true).extension(:identifier_mangling)
    db[:a].quote_identifiers?.must_equal true
    db = Sequel::Database.new(:quote_identifiers=>false).extension(:identifier_mangling)
    db[:a].quote_identifiers?.must_equal false
  end

  it "should get identifier_input_method default from database" do
    db = Sequel::Database.new(:identifier_input_method=>:upcase).extension(:identifier_mangling)
    db[:a].identifier_input_method.must_equal :upcase
    db = Sequel::Database.new(:identifier_input_method=>:downcase).extension(:identifier_mangling)
    db[:a].identifier_input_method.must_equal :downcase
  end

  it "should get identifier_output_method default from database" do
    db = Sequel::Database.new(:identifier_output_method=>:upcase).extension(:identifier_mangling)
    db[:a].identifier_output_method.must_equal :upcase
    db = Sequel::Database.new(:identifier_output_method=>:downcase).extension(:identifier_mangling)
    db[:a].identifier_output_method.must_equal :downcase
  end
  
  it "should have with_quote_identifiers method which returns cloned dataset with changed literalization of identifiers" do
    @dataset.with_quote_identifiers(true).literal(:a).must_equal '"a"'
    @dataset.with_quote_identifiers(false).literal(:a).must_equal 'a'
    ds = @dataset.freeze.with_quote_identifiers(false)
    ds.literal(:a).must_equal 'a'
    ds.frozen?.must_equal true
  end
  
  it "should have with_identifier_input_method method which returns cloned dataset with changed literalization of identifiers" do
    @dataset.with_identifier_input_method(:upcase).literal(:a).must_equal 'A'
    @dataset.with_identifier_input_method(:downcase).literal(:A).must_equal 'a'
    @dataset.with_identifier_input_method(:reverse).literal(:at_b).must_equal 'b_ta'
    ds = @dataset.freeze.with_identifier_input_method(:reverse)
    ds.frozen?.must_equal true
    ds.literal(:at_b).must_equal 'b_ta'
  end
  
  it "should have with_identifier_output_method method which returns cloned dataset with changed identifiers returned from the database" do
    @dataset.send(:output_identifier, "at_b_C").must_equal :at_b_C
    @dataset.with_identifier_output_method(:upcase).send(:output_identifier, "at_b_C").must_equal :AT_B_C
    @dataset.with_identifier_output_method(:downcase).send(:output_identifier, "at_b_C").must_equal :at_b_c
    @dataset.with_identifier_output_method(:reverse).send(:output_identifier, "at_b_C").must_equal :C_b_ta
    ds = @dataset.freeze.with_identifier_output_method(:reverse)
    ds.send(:output_identifier, "at_b_C").must_equal :C_b_ta
    ds.frozen?.must_equal true
  end
  
  it "should have output_identifier handle empty identifiers" do
    @dataset.send(:output_identifier, "").must_equal :untitled
    @dataset.with_identifier_output_method(:upcase).send(:output_identifier, "").must_equal :UNTITLED
    @dataset.with_identifier_output_method(:downcase).send(:output_identifier, "").must_equal :untitled
    @dataset.with_identifier_output_method(:reverse).send(:output_identifier, "").must_equal :deltitnu
  end
end

describe "identifier_mangling extension" do
  it "should be able to load dialects based on the database name" do
    Sequel.mock(:host=>'access').select(Date.new(2011, 12, 13)).sql.must_equal 'SELECT #2011-12-13#'
    Sequel.mock(:host=>'db2').select(1).sql.must_equal 'SELECT 1 FROM "SYSIBM"."SYSDUMMY1"'
    Sequel.mock(:host=>'mssql')[:a].full_text_search(:b, 'c').sql.must_equal "SELECT * FROM [A] WHERE (CONTAINS ([B], 'c'))"
    Sequel.mock(:host=>'mysql')[:a].full_text_search(:b, 'c').sql.must_equal "SELECT * FROM `a` WHERE (MATCH (`b`) AGAINST ('c'))"
    Sequel.mock(:host=>'oracle')[:a].limit(1).sql.must_equal 'SELECT * FROM (SELECT * FROM "A") "T1" WHERE (ROWNUM <= 1)'
    Sequel.mock(:host=>'postgres')[:a].full_text_search(:b, 'c').sql.must_equal "SELECT * FROM \"a\" WHERE (to_tsvector(CAST('simple' AS regconfig), (COALESCE(\"b\", ''))) @@ to_tsquery(CAST('simple' AS regconfig), 'c'))"
    Sequel.mock(:host=>'sqlanywhere').from(:a).offset(1).sql.must_equal 'SELECT TOP 2147483647 START AT (1 + 1) * FROM "A"'
    Sequel.mock(:host=>'sqlite')[Sequel[:a].as(:b)].sql.must_equal "SELECT * FROM `a` AS 'b'"
  end
end

describe Sequel::Model, ".[] optimization" do
  before do
    @db = Sequel.mock(:quote_identifiers=>true).extension(:identifier_mangling)
    def @db.schema(*) [[:id, {:primary_key=>true}]] end
    def @db.supports_schema_parsing?() true end
    @c = Class.new(Sequel::Model(@db))
    @ds = @db.dataset.with_quote_identifiers(true)
  end

  it "should have simple_pk and simple_table respect dataset's identifier input methods" do
    ds = @db.from(:ab).with_identifier_input_method(:reverse)
    @c.set_dataset ds
    @c.simple_table.must_equal '"ba"'
    @c.set_primary_key :cd
    @c.simple_pk.must_equal '"dc"'
    @c.set_dataset ds.from(Sequel[:ef][:gh])
    @c.simple_table.must_equal '"fe"."hg"'
  end

  with_symbol_splitting "should have simple_pk and simple_table respect dataset's identifier input methods when using splittable symbols" do
    ds = @db.from(:ab).with_identifier_input_method(:reverse)
    @c.set_dataset ds.from(:ef__gh)
    @c.simple_table.must_equal '"fe"."hg"'
  end
end
