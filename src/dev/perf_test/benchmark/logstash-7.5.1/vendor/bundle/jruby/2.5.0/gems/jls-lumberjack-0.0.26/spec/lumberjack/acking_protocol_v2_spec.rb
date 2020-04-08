# encoding: utf-8
require "lumberjack/server"
require "flores/random"

describe Lumberjack::AckingProtocolV2 do
  let(:results) { [] }
  subject { Lumberjack::AckingProtocolV2.new(number_of_events) }
  before { 1.upto(number_of_events) { |n| results << subject.ack?(n) } }

  context "with multiples events" do
    let(:number_of_events) { Flores::Random.integer(100..1024) }

    it "should return multiples partial acks" do
      expect(results.size).to eq(number_of_events)
      expect(results.count(true)).to be_within(1).of((number_of_events / number_of_events * Lumberjack::AckingProtocolV2::ACK_RATIO).ceil)
    end

    it "last ack should be true" do
      expect(results.last).to be_truthy
    end
  end

  context "with only one event" do
    let(:number_of_events) { 1 }

    it "should return true only once" do
      expect(results.size).to eq(number_of_events)
      expect(results.count(true)).to eq(1)
    end
  end
end
