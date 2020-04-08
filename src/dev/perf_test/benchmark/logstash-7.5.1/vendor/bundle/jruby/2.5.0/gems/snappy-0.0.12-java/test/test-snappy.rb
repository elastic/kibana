require 'minitest/autorun'
require 'minitest/spec'
require 'snappy'

describe Snappy do
  T = [*'a'..'z', *'A'..'Z', *'0'..'9']

  it 'well done' do
    s = Array.new(1024){T.sample}.join
    Snappy.inflate(Snappy.deflate s).must_equal(s)
  end

  it 'well done (pair)' do
    s = Array.new(1024){T.sample}.join
    [
     [:deflate,  :inflate],
     [:compress, :uncompress],
     [:dump,     :load],
    ].each do |(i, o)|
      Snappy.__send__(o, (Snappy.__send__ i,  s)).must_equal(s)
      eval %{Snappy.#{o}(Snappy.#{i} s).must_equal(s)}
    end
  end

  describe '#deflate' do
    it 'can pass buffer' do
      skip 'cannot pass buffer in jruby' if defined? JRUBY_VERSION
      s = 'a' * 1024
      d = ' ' * 1024
      r = Snappy.deflate(s, d)
      d.must_be_same_as r
    end
  end

  describe '#inflate' do
    it 'can pass buffer' do
      skip 'cannot pass buffer in jruby' if defined? JRUBY_VERSION
      s = Snappy.deflate('a' * 1024)
      d = ' ' * 1024
      r = Snappy.inflate(s, d)
      d.must_be_same_as r
    end
  end

  describe '#valid?' do
    it 'return true when passed deflated data' do
      skip 'snappy-jars does not have valid?' if defined? JRUBY_VERSION
      d = Snappy.deflate(Array.new(1024){T.sample}.join)
      Snappy.valid?(d).must_equal true
    end

    it 'return false when passed invalid data' do
      skip 'snappy-jars does not have valid?' if defined? JRUBY_VERSION
      d = Snappy.deflate(Array.new(1024){T.sample}.join).reverse
      Snappy.valid?(d).must_equal false
    end
  end
end
