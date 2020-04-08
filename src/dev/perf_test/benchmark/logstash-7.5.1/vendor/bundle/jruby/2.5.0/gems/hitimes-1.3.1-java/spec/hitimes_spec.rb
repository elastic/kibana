require 'spec_helper'

describe Hitimes do
  it "can time a block of code" do
    d = Hitimes.measure do
      sleep 0.2
    end
    d.must_be_close_to(0.2, 0.002)
  end

  it "raises an error if measure is called with no block" do
    lambda{ Hitimes.measure }.must_raise( Hitimes::Error )
  end

  it "has the raw instant value" do
    v = Hitimes.raw_instant
    v.must_be :>, 0
  end

  it "has access to the instant conversion factor" do
    f = Hitimes::INSTANT_CONVERSION_FACTOR
    f.must_be :>, 0
  end
end
