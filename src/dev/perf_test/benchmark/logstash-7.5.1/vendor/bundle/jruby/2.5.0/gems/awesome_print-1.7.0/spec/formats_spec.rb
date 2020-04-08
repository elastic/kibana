require 'spec_helper'
require "bigdecimal"
require "rational"
require "set"

RSpec.describe "AwesomePrint" do
  before do
    stub_dotfile!
  end

  describe "Array" do
    before do
      @arr = [ 1, :two, "three", [ nil, [ true, false] ] ]
    end

    it "empty array" do
      expect([].ai).to eq("[]")
    end

    it "plain multiline" do
      expect(@arr.ai(:plain => true)).to eq <<-EOS.strip
[
    [0] 1,
    [1] :two,
    [2] "three",
    [3] [
        [0] nil,
        [1] [
            [0] true,
            [1] false
        ]
    ]
]
EOS
      end

    it "plain multiline without index" do
      expect(@arr.ai(:plain => true, :index => false)).to eq <<-EOS.strip
[
    1,
    :two,
    "three",
    [
        nil,
        [
            true,
            false
        ]
    ]
]
EOS
      end

    it "plain multiline indented" do
      expect(@arr.ai(:plain => true, :indent => 2)).to eq <<-EOS.strip
[
  [0] 1,
  [1] :two,
  [2] "three",
  [3] [
    [0] nil,
    [1] [
      [0] true,
      [1] false
    ]
  ]
]
EOS
    end

    it "plain multiline indented without index" do
      expect(@arr.ai(:plain => true, :indent => 2, :index => false)).to eq <<-EOS.strip
[
  1,
  :two,
  "three",
  [
    nil,
    [
      true,
      false
    ]
  ]
]
EOS
    end

    it "plain single line" do
      expect(@arr.ai(:plain => true, :multiline => false)).to eq('[ 1, :two, "three", [ nil, [ true, false ] ] ]')
    end

    it "colored multiline (default)" do
      expect(@arr.ai).to eq <<-EOS.strip
[
    \e[1;37m[0] \e[0m\e[1;34m1\e[0m,
    \e[1;37m[1] \e[0m\e[0;36m:two\e[0m,
    \e[1;37m[2] \e[0m\e[0;33m\"three\"\e[0m,
    \e[1;37m[3] \e[0m[
        \e[1;37m[0] \e[0m\e[1;31mnil\e[0m,
        \e[1;37m[1] \e[0m[
            \e[1;37m[0] \e[0m\e[1;32mtrue\e[0m,
            \e[1;37m[1] \e[0m\e[1;31mfalse\e[0m
        ]
    ]
]
EOS
      end

    it "colored multiline indented" do
      expect(@arr.ai(:indent => 8)).to eq <<-EOS.strip
[
        \e[1;37m[0] \e[0m\e[1;34m1\e[0m,
        \e[1;37m[1] \e[0m\e[0;36m:two\e[0m,
        \e[1;37m[2] \e[0m\e[0;33m\"three\"\e[0m,
        \e[1;37m[3] \e[0m[
                \e[1;37m[0] \e[0m\e[1;31mnil\e[0m,
                \e[1;37m[1] \e[0m[
                        \e[1;37m[0] \e[0m\e[1;32mtrue\e[0m,
                        \e[1;37m[1] \e[0m\e[1;31mfalse\e[0m
                ]
        ]
]
EOS
    end

    it "colored single line" do
      expect(@arr.ai(:multiline => false)).to eq("[ \e[1;34m1\e[0m, \e[0;36m:two\e[0m, \e[0;33m\"three\"\e[0m, [ \e[1;31mnil\e[0m, [ \e[1;32mtrue\e[0m, \e[1;31mfalse\e[0m ] ] ]")
    end
  end

  #------------------------------------------------------------------------------
  describe "Nested Array" do
    before do
      @arr = [ 1, 2 ]
      @arr << @arr
    end

    it "plain multiline" do
      expect(@arr.ai(:plain => true)).to eq <<-EOS.strip
[
    [0] 1,
    [1] 2,
    [2] [...]
]
EOS
    end

    it "plain multiline without index" do
      expect(@arr.ai(:plain => true, :index => false)).to eq <<-EOS.strip
[
    1,
    2,
    [...]
]
EOS
    end

    it "plain single line" do
      expect(@arr.ai(:plain => true, :multiline => false)).to eq("[ 1, 2, [...] ]")
    end
  end

  #------------------------------------------------------------------------------
  describe "Limited Output Array" do
    before(:each) do
      @arr = (1..1000).to_a
    end

    it "plain limited output large" do
      expect(@arr.ai(:plain => true, :limit => true)).to eq <<-EOS.strip
[
    [  0] 1,
    [  1] 2,
    [  2] 3,
    [  3] .. [996],
    [997] 998,
    [998] 999,
    [999] 1000
]
EOS
    end

    it "plain limited output small" do
      @arr = @arr[0..3]
      expect(@arr.ai(:plain => true, :limit => true)).to eq <<-EOS.strip
[
    [0] 1,
    [1] 2,
    [2] 3,
    [3] 4
]
EOS
    end

    it "plain limited output with 10 lines" do
      expect(@arr.ai(:plain => true, :limit => 10)).to eq <<-EOS.strip
[
    [  0] 1,
    [  1] 2,
    [  2] 3,
    [  3] 4,
    [  4] 5,
    [  5] .. [995],
    [996] 997,
    [997] 998,
    [998] 999,
    [999] 1000
]
EOS
    end

    it "plain limited output with 11 lines" do
      expect(@arr.ai(:plain => true, :limit => 11)).to eq <<-EOS.strip
[
    [  0] 1,
    [  1] 2,
    [  2] 3,
    [  3] 4,
    [  4] 5,
    [  5] .. [994],
    [995] 996,
    [996] 997,
    [997] 998,
    [998] 999,
    [999] 1000
]
EOS
    end
  end

  #------------------------------------------------------------------------------
  describe "Limited Output Hash" do
    before(:each) do
      @hash = ("a".."z").inject({}) { |h, v| h.merge({ v => v.to_sym }) }
    end

    it "plain limited output" do
      expect(@hash.ai(:sort_keys => true, :plain => true, :limit => true)).to eq <<-EOS.strip
{
    "a" => :a,
    "b" => :b,
    "c" => :c,
    "d" => :d .. "w" => :w,
    "x" => :x,
    "y" => :y,
    "z" => :z
}
EOS
    end
  end

  #------------------------------------------------------------------------------
  describe "Hash" do
    before do
      @hash = { 1 => { :sym => { "str" => { [1, 2, 3] => { { :k => :v } => Hash } } } } }
    end

    it "empty hash" do
      expect({}.ai).to eq("{}")
    end

    it "plain multiline" do
      expect(@hash.ai(:plain => true)).to eq <<-EOS.strip
{
    1 => {
        :sym => {
            "str" => {
                [ 1, 2, 3 ] => {
                    { :k => :v } => Hash < Object
                }
            }
        }
    }
}
EOS
    end

    it "plain multiline indented" do
      expect(@hash.ai(:plain => true, :indent => 1)).to eq <<-EOS.strip
{
 1 => {
  :sym => {
   "str" => {
    [ 1, 2, 3 ] => {
     { :k => :v } => Hash < Object
    }
   }
  }
 }
}
EOS
    end

    it "plain single line" do
      expect(@hash.ai(:plain => true, :multiline => false)).to eq('{ 1 => { :sym => { "str" => { [ 1, 2, 3 ] => { { :k => :v } => Hash < Object } } } } }')
    end

    it "colored multiline (default)" do
      expect(@hash.ai).to eq <<-EOS.strip
{
    1\e[0;37m => \e[0m{
        :sym\e[0;37m => \e[0m{
            \"str\"\e[0;37m => \e[0m{
                [ 1, 2, 3 ]\e[0;37m => \e[0m{
                    { :k => :v }\e[0;37m => \e[0m\e[1;33mHash < Object\e[0m
                }
            }
        }
    }
}
EOS
    end

    it "colored multiline indented" do
      expect(@hash.ai(:indent => 2)).to eq <<-EOS.strip
{
  1\e[0;37m => \e[0m{
    :sym\e[0;37m => \e[0m{
      \"str\"\e[0;37m => \e[0m{
        [ 1, 2, 3 ]\e[0;37m => \e[0m{
          { :k => :v }\e[0;37m => \e[0m\e[1;33mHash < Object\e[0m
        }
      }
    }
  }
}
EOS
    end

    it "colored single line" do
      expect(@hash.ai(:multiline => false)).to eq("{ 1\e[0;37m => \e[0m{ :sym\e[0;37m => \e[0m{ \"str\"\e[0;37m => \e[0m{ [ 1, 2, 3 ]\e[0;37m => \e[0m{ { :k => :v }\e[0;37m => \e[0m\e[1;33mHash < Object\e[0m } } } } }")
    end

  end

  #------------------------------------------------------------------------------
  describe "Nested Hash" do
    before do
      @hash = {}
      @hash[:a] = @hash
    end

    it "plain multiline" do
      expect(@hash.ai(:plain => true)).to eq <<-EOS.strip
{
    :a => {...}
}
EOS
    end

    it "plain single line" do
      expect(@hash.ai(:plain => true, :multiline => false)).to eq('{ :a => {...} }')
    end
  end

  #------------------------------------------------------------------------------
  describe "Hash with several keys" do
    before do
      @hash = {"b" => "b", :a => "a", :z => "z", "alpha" => "alpha"}
    end

    it "plain multiline" do
      out = @hash.ai(:plain => true)
      if RUBY_VERSION.to_f < 1.9 # Order of @hash keys is not guaranteed.
        expect(out).to match(/^\{[^\}]+\}/m)
        expect(out).to match(/        "b" => "b",?/)
        expect(out).to match(/         :a => "a",?/)
        expect(out).to match(/         :z => "z",?/)
        expect(out).to match(/    "alpha" => "alpha",?$/)
      else
        expect(out).to eq <<-EOS.strip
{
        "b" => "b",
         :a => "a",
         :z => "z",
    "alpha" => "alpha"
}
EOS
      end
    end

    it "plain multiline with sorted keys" do
      expect(@hash.ai(:plain => true, :sort_keys => true)).to eq <<-EOS.strip
{
         :a => "a",
    "alpha" => "alpha",
        "b" => "b",
         :z => "z"
}
EOS
    end

  end

  #------------------------------------------------------------------------------
  describe "Negative options[:indent]" do
    #
    # With Ruby < 1.9 the order of hash keys is not defined so we can't
    # reliably compare the output string.
    #
    it "hash keys must be left aligned" do
      hash = { [0, 0, 255] => :yellow, :red => "rgb(255, 0, 0)", "magenta" => "rgb(255, 0, 255)" }
      out = hash.ai(:plain => true, :indent => -4, :sort_keys => true)
      expect(out).to eq <<-EOS.strip
{
    [ 0, 0, 255 ] => :yellow,
    "magenta"     => "rgb(255, 0, 255)",
    :red          => "rgb(255, 0, 0)"
}
EOS
    end

    it "nested hash keys should be indented (array of hashes)" do
      arr = [ { :a => 1, :bb => 22, :ccc => 333}, { 1 => :a, 22 => :bb, 333 => :ccc} ]
      out = arr.ai(:plain => true, :indent => -4, :sort_keys => true)
      expect(out).to eq <<-EOS.strip
[
    [0] {
        :a   => 1,
        :bb  => 22,
        :ccc => 333
    },
    [1] {
        1   => :a,
        22  => :bb,
        333 => :ccc
    }
]
EOS
    end

    it "nested hash keys should be indented (hash of hashes)" do
      arr = { :first => { :a => 1, :bb => 22, :ccc => 333}, :second => { 1 => :a, 22 => :bb, 333 => :ccc} }
      out = arr.ai(:plain => true, :indent => -4, :sort_keys => true)
      expect(out).to eq <<-EOS.strip
{
    :first  => {
        :a   => 1,
        :bb  => 22,
        :ccc => 333
    },
    :second => {
        1   => :a,
        22  => :bb,
        333 => :ccc
    }
}
EOS
    end
  end

  #------------------------------------------------------------------------------
  describe "Class" do
    it "should show superclass (plain)" do
      expect(self.class.ai(:plain => true)).to eq("#{self.class} < #{self.class.superclass}")
    end

    it "should show superclass (color)" do
      expect(self.class.ai).to eq("#{self.class} < #{self.class.superclass}".yellow)
    end
  end

  #------------------------------------------------------------------------------
  describe "File" do
    it "should display a file (plain)" do
      File.open(__FILE__, "r") do |f|
        expect(f.ai(:plain => true)).to eq("#{f.inspect}\n" << `ls -alF #{f.path}`.chop)
      end
    end
  end

  #------------------------------------------------------------------------------
  describe "Dir" do
    it "should display a direcory (plain)" do
      Dir.open(File.dirname(__FILE__)) do |d|
        expect(d.ai(:plain => true)).to eq("#{d.inspect}\n" << `ls -alF #{d.path}`.chop)
      end
    end
  end

  #------------------------------------------------------------------------------
  describe "BigDecimal and Rational" do
    it "should present BigDecimal object with arbitrary precision" do
      big = BigDecimal("201020102010201020102010201020102010.4")
      expect(big.ai(:plain => true)).to eq("201020102010201020102010201020102010.4")
    end

    it "should present Rational object with arbitrary precision" do
      rat = Rational(201020102010201020102010201020102010, 2)
      out = rat.ai(:plain => true)
      #
      # Ruby 1.9 slightly changed the format of Rational#to_s, see
      # http://techtime.getharvest.com/blog/harvest-is-now-on-ruby-1-dot-9-3 and
      # http://www.ruby-forum.com/topic/189397
      #
      if RUBY_VERSION < "1.9"
        expect(out).to eq("100510051005100510051005100510051005")
      else
        expect(out).to eq("100510051005100510051005100510051005/1")
      end
    end
  end

  #------------------------------------------------------------------------------
  describe "Utility methods" do
    it "should merge options" do
      ap = AwesomePrint::Inspector.new
      ap.send(:merge_options!, { :color => { :array => :black }, :indent => 0 })
      options = ap.instance_variable_get("@options")
      expect(options[:color][:array]).to eq(:black)
      expect(options[:indent]).to eq(0)
    end
  end

  #------------------------------------------------------------------------------
  describe "Set" do
    before do
      @arr = [1, :two, "three" ]
      @set = Set.new(@arr)
    end

    it "empty set" do
      expect(Set.new.ai).to eq([].ai)
    end

    if RUBY_VERSION > "1.9"
      it "plain multiline" do
        expect(@set.ai(:plain => true)).to eq(@arr.ai(:plain => true))
      end

      it "plain multiline indented" do
        expect(@set.ai(:plain => true, :indent => 1)).to eq(@arr.ai(:plain => true, :indent => 1))
      end

      it "plain single line" do
        expect(@set.ai(:plain => true, :multiline => false)).to eq(@arr.ai(:plain => true, :multiline => false))
      end

      it "colored multiline (default)" do
        expect(@set.ai).to eq(@arr.ai)
      end
    else # Prior to Ruby 1.9 the order of set values is unpredicatble.
      it "plain multiline" do
        expect(@set.sort_by{ |x| x.to_s }.ai(:plain => true)).to eq(@arr.sort_by{ |x| x.to_s }.ai(:plain => true))
      end

      it "plain multiline indented" do
        expect(@set.sort_by{ |x| x.to_s }.ai(:plain => true, :indent => 1)).to eq(@arr.sort_by{ |x| x.to_s }.ai(:plain => true, :indent => 1))
      end

      it "plain single line" do
        expect(@set.sort_by{ |x| x.to_s }.ai(:plain => true, :multiline => false)).to eq(@arr.sort_by{ |x| x.to_s }.ai(:plain => true, :multiline => false))
      end

      it "colored multiline (default)" do
        expect(@set.sort_by{ |x| x.to_s }.ai).to eq(@arr.sort_by{ |x| x.to_s }.ai)
      end
    end
  end

  #------------------------------------------------------------------------------
  describe "Struct" do
    before do
      @struct = unless defined?(Struct::SimpleStruct)
        Struct.new("SimpleStruct", :name, :address).new
      else
        Struct::SimpleStruct.new
      end
      @struct.name = "Herman Munster"
      @struct.address = "1313 Mockingbird Lane"
    end

    it "empty struct" do
      expect(Struct.new("EmptyStruct").ai).to eq("\e[1;33mStruct::EmptyStruct < Struct\e[0m")
    end

    it "plain multiline" do
      s1 = <<-EOS.strip
    address = \"1313 Mockingbird Lane\",
    name = \"Herman Munster\"
EOS
      s2 = <<-EOS.strip
    name = \"Herman Munster\",
    address = \"1313 Mockingbird Lane\"
EOS
      expect(@struct.ai(:plain => true)).to satisfy { |out| out.match(s1) || out.match(s2) }
    end

    it "plain multiline indented" do
      s1 = <<-EOS.strip
 address = "1313 Mockingbird Lane",
 name = "Herman Munster"
EOS
      s2 = <<-EOS.strip
 name = "Herman Munster",
 address = "1313 Mockingbird Lane"
EOS
      expect(@struct.ai(:plain => true, :indent => 1)).to satisfy { |out| out.match(s1) || out.match(s2) }
    end

    it "plain single line" do
      s1 = "address = \"1313 Mockingbird Lane\", name = \"Herman Munster\""
      s2 = "name = \"Herman Munster\", address = \"1313 Mockingbird Lane\""
      expect(@struct.ai(:plain => true, :multiline => false)).to satisfy { |out| out.match(s1) || out.match(s2) }
    end

    it "colored multiline (default)" do
      s1 = <<-EOS.strip
    address\e[0;37m = \e[0m\e[0;33m\"1313 Mockingbird Lane\"\e[0m,
    name\e[0;37m = \e[0m\e[0;33m\"Herman Munster\"\e[0m
EOS
      s2 = <<-EOS.strip
    name\e[0;37m = \e[0m\e[0;33m\"Herman Munster\"\e[0m,
    address\e[0;37m = \e[0m\e[0;33m\"1313 Mockingbird Lane\"\e[0m
EOS
      expect(@struct.ai).to satisfy { |out| out.include?(s1) || out.include?(s2) }
    end
  end

  #------------------------------------------------------------------------------
  describe "Inherited from standard Ruby classes" do
    after do
      Object.instance_eval{ remove_const :My } if defined?(My)
    end

    it "inherited from Array should be displayed as Array" do
      class My < Array; end

      my = My.new([ 1, :two, "three", [ nil, [ true, false ] ] ])
      expect(my.ai(:plain => true)).to eq <<-EOS.strip
[
    [0] 1,
    [1] :two,
    [2] "three",
    [3] [
        [0] nil,
        [1] [
            [0] true,
            [1] false
        ]
    ]
]
EOS
    end

    it "inherited from Hash should be displayed as Hash" do
      class My < Hash; end

      my = My[ { 1 => { :sym => { "str" => { [1, 2, 3] => { { :k => :v } => Hash } } } } } ]
      expect(my.ai(:plain => true)).to eq <<-EOS.strip
{
    1 => {
        :sym => {
            "str" => {
                [ 1, 2, 3 ] => {
                    { :k => :v } => Hash < Object
                }
            }
        }
    }
}
EOS
    end

    it "inherited from File should be displayed as File" do
      class My < File; end

      my = File.new('/dev/null') rescue File.new('nul')
      expect(my.ai(:plain => true)).to eq("#{my.inspect}\n" << `ls -alF #{my.path}`.chop)
    end

    it "inherited from Dir should be displayed as Dir" do
      class My < Dir; end

      require 'tmpdir'
      my = My.new(Dir.tmpdir)
      expect(my.ai(:plain => true)).to eq("#{my.inspect}\n" << `ls -alF #{my.path}`.chop)
    end

    it "should handle a class that defines its own #send method" do
      class My
        def send(arg1, arg2, arg3); end
      end

      my = My.new
      expect { my.methods.ai(:plain => true) }.not_to raise_error
    end

    it "should handle a class defines its own #method method (ex. request.method)" do
      class My
        def method
          'POST'
        end
      end

      my = My.new
      expect { my.methods.ai(:plain => true) }.not_to raise_error
    end

    describe "should handle a class that defines its own #to_hash method" do
      it "that takes arguments" do
        class My
          def to_hash(a, b)
          end
        end

        my = My.new
        expect { my.ai(:plain => true) }.not_to raise_error
      end

      it "that returns nil" do
        class My
          def to_hash()
            return nil
          end
        end

        my = My.new
        expect { my.ai(:plain => true) }.not_to raise_error
      end

      it "that returns an object that doesn't support #keys" do
        class My
          def to_hash()
            object = Object.new
            object.define_singleton_method('[]') { return nil }

            return object
          end
        end

        my = My.new
        expect { my.ai(:plain => true) }.not_to raise_error
      end

      it "that returns an object that doesn't support subscripting" do
        class My
          def to_hash()
            object = Object.new
            object.define_singleton_method(:keys) { return [:foo] }

            return object
          end
        end

        my = My.new
        expect { my.ai(:plain => true) }.not_to raise_error
      end
    end
  end
end
