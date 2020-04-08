require_relative "spec_helper"

describe "Sequel::Plugins::ErrorSplitter" do
  before do
    @c = Class.new(Sequel::Model)
    @c.plugin :error_splitter
    @m = @c.new
    def @m.validate
      errors.add([:a, :b], 'is bad')
    end
  end

  it "should split errors for multiple columns and assign them to each column" do
    @m.valid?.must_equal false
    @m.errors.must_equal(:a=>['is bad'], :b=>['is bad'])
  end
end

