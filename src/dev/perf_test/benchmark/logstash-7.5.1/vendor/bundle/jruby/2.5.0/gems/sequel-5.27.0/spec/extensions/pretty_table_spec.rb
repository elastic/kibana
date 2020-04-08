require_relative "spec_helper"

require 'stringio'
Sequel.extension :pretty_table

describe "Dataset#print" do
  before do
    @output = StringIO.new
    @orig_stdout = $stdout
    $stdout = @output
    @dataset = Sequel.mock(:fetch=>[{:a=>1, :b=>2}, {:a=>3, :b=>4}, {:a=>5, :b=>6}])[:items].extension(:pretty_table)
  end

  after do
    $stdout = @orig_stdout
  end

  it "should print out a table with the values" do
    @dataset.print(:a, :b)
    @output.rewind
    @output.read.must_equal \
      "+-+-+\n|a|b|\n+-+-+\n|1|2|\n|3|4|\n|5|6|\n+-+-+\n"
  end

  it "should default to the dataset's columns" do
    @dataset.columns(:a, :b)
    @dataset.print
    @output.rewind
    @output.read.must_equal \
      "+-+-+\n|a|b|\n+-+-+\n|1|2|\n|3|4|\n|5|6|\n+-+-+\n"
  end
end

describe "PrettyTable" do
  before do
    @data1 = [
      {:x => 3, :y => 4}
    ]
    
    @data2 = [
      {:a => 23, :b => 45},
      {:a => 45, :b => 2377}
    ]

    @data3 = [
      {:aaa => 1},
      {:bb => 2},
      {:c => 3.1}
    ]

    @output = StringIO.new
    @orig_stdout = $stdout
    $stdout = @output
  end

  after do
    $stdout = @orig_stdout
  end
  
  it "should infer the columns if not given" do
    Sequel::PrettyTable.print(@data1)
    @output.rewind
    @output.read.must_equal(<<OUTPUT)
+-+-+
|x|y|
+-+-+
|3|4|
+-+-+
OUTPUT
  end
  
  it "should have #string return the string without printing" do
    Sequel::PrettyTable.string(@data1).must_equal((<<OUTPUT).chomp)
+-+-+
|x|y|
+-+-+
|3|4|
+-+-+
OUTPUT
    @output.rewind
    @output.read.must_equal ''
  end
  
  it "should calculate the maximum width of each column correctly" do
    Sequel::PrettyTable.print(@data2, [:a, :b])
    @output.rewind
    @output.read.must_equal(<<OUTPUT)
+--+----+
|a |b   |
+--+----+
|23|  45|
|45|2377|
+--+----+
OUTPUT
  end

  it "should also take header width into account" do
    Sequel::PrettyTable.print(@data3, [:aaa, :bb, :c])
    @output.rewind
    @output.read.must_equal(<<OUTPUT)
+---+--+---+
|aaa|bb|c  |
+---+--+---+
|  1|  |   |
|   | 2|   |
|   |  |3.1|
+---+--+---+
OUTPUT
  end
  
  it "should print only the specified columns" do
    Sequel::PrettyTable.print(@data2, [:a])
    @output.rewind
    @output.read.must_equal(<<OUTPUT)
+--+
|a |
+--+
|23|
|45|
+--+
OUTPUT
  end
end
