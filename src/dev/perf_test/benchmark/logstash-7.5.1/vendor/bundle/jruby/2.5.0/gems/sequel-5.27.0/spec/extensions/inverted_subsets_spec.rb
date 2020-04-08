require_relative "spec_helper"

describe "Sequel::Plugins::InvertedSubsets" do
  it "should add an inverted subset method which inverts the condition" do
    c = Class.new(Sequel::Model(:a))
    c.plugin :inverted_subsets
    c.dataset_module{subset(:published, :published => true)}
    c.not_published.sql.must_equal 'SELECT * FROM a WHERE (published IS NOT TRUE)'
  end

  it "should support a configuration block to customise the inverted method name" do
    c = Class.new(Sequel::Model(:a))
    c.plugin(:inverted_subsets){|name| "exclude_#{name}"}
    c.dataset_module{where(:published, :published => true)}
    c.exclude_published.sql.must_equal 'SELECT * FROM a WHERE (published IS NOT TRUE)'
  end

  it "should chain to existing dataset" do
    c = Class.new(Sequel::Model(:a))
    c.plugin :inverted_subsets
    c.dataset_module{where(:published, :published => true)}
    c.where(1=>0).not_published.sql.must_equal 'SELECT * FROM a WHERE ((1 = 0) AND (published IS NOT TRUE))'
  end

  it "should work in subclasses" do
    c = Class.new(Sequel::Model)
    c.plugin(:inverted_subsets){|name| "exclude_#{name}"}
    c = Class.new(c)
    c.dataset = :a
    c.dataset_module{subset(:published, :published => true)}
    c.exclude_published.sql.must_equal 'SELECT * FROM a WHERE (published IS NOT TRUE)'
  end
end
