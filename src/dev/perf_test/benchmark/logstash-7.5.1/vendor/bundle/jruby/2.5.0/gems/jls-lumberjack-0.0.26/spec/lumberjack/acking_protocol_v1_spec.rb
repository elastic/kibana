# encoding: utf-8
require "lumberjack/server"
require "flores/random"

describe Lumberjack::AckingProtocolV1 do
  let(:number_of_events) { Flores::Random.integer(100..1024) }

  subject { Lumberjack::AckingProtocolV1.new(number_of_events) }

  it "should return true only once" do
    results = []
    number_of_events.times { |n| results << subject.ack?(n) }
    expect(results.size).to eq(number_of_events)
    expect(results.count(true)).to eq(1)
  end
end
