
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler::JobArray do

  class DummyJob < Struct.new(:id, :next_time); end

  before(:each) do
    @array = Rufus::Scheduler::JobArray.new
  end

  describe '#push' do

    it 'pushes jobs' do

      @array.push(DummyJob.new('a', Time.local(0)))

      expect(@array.to_a.collect(&:id)).to eq(%w[ a ])
    end

    it 'pushes and remove duplicates' do

      j = DummyJob.new('a', Time.local(0))

      @array.push(j)
      @array.push(j)

      expect(@array.to_a.collect(&:id)).to eq(%w[ a ])
    end
  end
end

