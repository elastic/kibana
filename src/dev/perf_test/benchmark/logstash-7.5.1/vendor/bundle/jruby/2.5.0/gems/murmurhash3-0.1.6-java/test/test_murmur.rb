require 'minitest/spec'
require 'minitest/autorun'

shared_examples_128 = proc do
  it 'should make correct hash for string' do
    murmur.str_hash('asdfqwer', 0).must_equal [0xd6d7d367, 0xcb41f064, 0x8973cd72, 0xc345e72e]
    murmur.str_hash('asdfqwerzxcvyui', 0).must_equal [0x007b2172f, 0x64ecae1b, 0x1813b5a5, 0x9c674ee6]
    murmur.str_hash('asdfqwerzxcvyuio', 0).must_equal [0xf508df57, 0xbb38f3fd, 0xf48c9d98, 0xb65c36cd]
    murmur.str_hash('asdfqwerzxcvyuio!', 0).must_equal [0x8a011755, 0xb13d463f, 0x8386d32a, 0x0df8884c]
  end

  it 'should make correct hash for 32bit integer' do
    murmur.int32_hash(1717859169).must_equal [0x20b48108, 0x10369ceb, 0x3ad523cc, 0xdacb587f]
    murmur.int32_hash(1717859169).must_equal murmur.str_hash('asdf')
  end

  it 'should make correct hash for 64bit integer' do
    murmur.int64_hash(0x12345678).must_equal murmur.str_hash("\x78\x56\x34\x12\x00\x00\x00\x00")
    murmur.int64_hash(0x1234567812345678).must_equal murmur.str_hash("\x78\x56\x34\x12\x78\x56\x34\x12")
  end

  it 'should make correct fmix for 64bit integer' do
    murmur.fmix(1717859169).must_equal 0xbefb9076a3712207
    murmur.fmix(12345678912345678).must_equal 0x197ef59146f5221c
  end
end

shared_examples_32 = proc do
  it 'should make correct hash for string' do
    murmur.str_hash('asdfqwer', 0).must_equal 0xa46b5209
    murmur.str_hash('asdfqwerty', 0).must_equal 0xa3cfe04b
    murmur.str_hash('asd', 0).must_equal 0x14570c6f
  end

  it 'should make correct hash for 32bit integer' do
    murmur.int32_hash(1717859169).must_equal 0x1b20e026
    murmur.int32_hash(1717859169).must_equal murmur.str_hash('asdf')
  end

  it 'should make correct hash for 64bit integer' do
    murmur.int64_hash(0x12345678).must_equal murmur.str_hash("\x78\x56\x34\x12\x00\x00\x00\x00")
    murmur.int64_hash(0x1234567812345678).must_equal murmur.str_hash("\x78\x56\x34\x12\x78\x56\x34\x12")
  end

  it 'should make correct fmix for 32bit integer' do
    murmur.fmix(1717859169).must_equal 0x17561734
  end
end

require 'murmurhash3/pure_ruby'
describe "Pure ruby 32" do
  let(:murmur) { MurmurHash3::PureRuby32 }
  class_exec &shared_examples_32
end

describe "Pure ruby 128" do
  let(:murmur) { MurmurHash3::PureRuby128 }
  class_exec &shared_examples_128
end

begin
  require 'murmurhash3/native_murmur'

  describe "Native 32" do
    let(:murmur) { MurmurHash3::Native32 }
    class_exec &shared_examples_32
  end

  describe "Native 128" do
    let(:murmur) { MurmurHash3::Native128 }
    class_exec &shared_examples_128
  end

rescue LoadError => e
  puts "Could not load native extension: #{e}"
end
