require "minitest/autorun"
require "minitest/spec"
require "snappy"
require "stringio"

describe Snappy::Writer do
  before do
    @buffer = StringIO.new
  end

  subject do
    Snappy::Writer.new @buffer
  end

  describe :initialize do
    it "should yield itself to the block" do
      yielded = nil
      returned = Snappy::Writer.new @buffer do |w|
        yielded = w
      end
      returned.must_equal yielded
    end

    it "should write the header" do
      subject.io.string.must_equal [Snappy::Writer::MAGIC,
                                    Snappy::Writer::DEFAULT_VERSION,
                                    Snappy::Writer::MINIMUM_COMPATIBLE_VERSION].pack("a8NN")
    end

    it "should dump on the end of yield" do
      Snappy::Writer.new @buffer do |w|
        w << "foo"
      end
      foo = Snappy.deflate "foo"
      @buffer.string[16, @buffer.size - 16].must_equal [foo.size, foo].pack("Na#{foo.size}")
    end
  end

  describe :io do
    it "should be a constructor argument" do
      io = StringIO.new
      Snappy::Writer.new(io).io.must_equal io
    end
  end

  describe :block_size do
    it "should default to DEFAULT_BLOCK_SIZE" do
      Snappy::Writer.new(StringIO.new).block_size.must_equal Snappy::Writer::DEFAULT_BLOCK_SIZE
    end

    it "should be settable via the constructor" do
      Snappy::Writer.new(StringIO.new, 42).block_size.must_equal 42
    end
  end
end
