# frozen_string_literal: true

require 'spec_helper'

describe MessagePack::Timestamp do
  describe 'malformed format' do
    it do
      expect do
        MessagePack::Timestamp.from_msgpack_ext([0xd4, 0x00].pack("C*"))
      end.to raise_error(MessagePack::MalformedFormatError)
    end
  end

  describe 'register_type with Time' do
    let(:factory) do
      factory = MessagePack::Factory.new
      factory.register_type(
        MessagePack::Timestamp::TYPE,
        Time,
        packer: MessagePack::Time::Packer,
        unpacker: MessagePack::Time::Unpacker
      )
      factory
    end

    let(:time) { Time.local(2019, 6, 17, 1, 2, 3, 123_456_789 / 1000.0) }
    it 'serializes and deserializes Time' do
      prefix_fixext8_with_type_id = [0xd7, -1].pack("c*")

      packed = factory.pack(time)
      expect(packed).to start_with(prefix_fixext8_with_type_id)
      expect(packed.size).to eq(10)
      unpacked = factory.unpack(packed)
      expect(unpacked.to_i).to eq(time.to_i)
      expect(unpacked.to_f).to eq(time.to_f)
      # expect(unpacked).to eq(time) # we can't do it because of nsec (rational vs float?)
    end

    let(:time_without_nsec) { Time.local(2019, 6, 17, 1, 2, 3, 0) }
    it 'serializes time without nanosec as fixext4' do
      prefix_fixext4_with_type_id = [0xd6, -1].pack("c*")

      packed = factory.pack(time_without_nsec)
      expect(packed).to start_with(prefix_fixext4_with_type_id)
      expect(packed.size).to eq(6)
      unpacked = factory.unpack(packed)
      expect(unpacked).to eq(time_without_nsec)
    end

    let(:time_after_2514) { Time.at(1 << 34) } # the max num of 34bit int means 2514-05-30 01:53:04 UTC
    it 'serializes time after 2038 as ext8' do
      prefix_ext8_with_12bytes_payload_and_type_id = [0xc7, 12, -1].pack("c*")

      expect(time_after_2514.to_i).to be > 0xffffffff
      packed = factory.pack(time_after_2514)
      expect(packed).to start_with(prefix_ext8_with_12bytes_payload_and_type_id)
      expect(packed.size).to eq(15)
    end

    it 'runs correctly (regression)' do
      expect(factory.unpack(factory.pack(Time.utc(2200)))).to eq(Time.utc(2200))
    end
  end

  describe 'register_type with MessagePack::Timestamp' do
    let(:factory) do
      factory = MessagePack::Factory.new
      factory.register_type(MessagePack::Timestamp::TYPE, MessagePack::Timestamp)
      factory
    end

    let(:timestamp) { MessagePack::Timestamp.new(Time.now.tv_sec, 123_456_789) }
    it 'serializes and deserializes MessagePack::Timestamp' do
      packed = factory.pack(timestamp)
      unpacked = factory.unpack(packed)
      expect(unpacked).to eq(timestamp)
    end
  end

  describe 'timestamp32' do
    it 'handles [1, 0]' do
      t = MessagePack::Timestamp.new(1, 0)

      payload = t.to_msgpack_ext
      unpacked = MessagePack::Timestamp.from_msgpack_ext(payload)

      expect(unpacked).to eq(t)
    end
  end

  describe 'timestamp64' do
    it 'handles [1, 1]' do
      t = MessagePack::Timestamp.new(1, 1)

      payload = t.to_msgpack_ext
      unpacked = MessagePack::Timestamp.from_msgpack_ext(payload)

      expect(unpacked).to eq(t)
    end
  end

  describe 'timestamp96' do
    it 'handles [-1, 0]' do
      t = MessagePack::Timestamp.new(-1, 0)

      payload = t.to_msgpack_ext
      unpacked = MessagePack::Timestamp.from_msgpack_ext(payload)

      expect(unpacked).to eq(t)
    end

    it 'handles [-1, 999_999_999]' do
      t = MessagePack::Timestamp.new(-1, 999_999_999)

      payload = t.to_msgpack_ext
      unpacked = MessagePack::Timestamp.from_msgpack_ext(payload)

      expect(unpacked).to eq(t)
    end
  end
end
