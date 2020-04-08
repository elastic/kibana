
#
# Specifying rufus-scheduler
#
# Fri Nov  1 05:56:03 JST 2013
#
# Ishinomaki
#

require 'spec_helper'


describe Rufus::Scheduler do

  class LosingLockScheduler < Rufus::Scheduler

    attr_reader :counter

    def initialize
      super
      @counter = 0
    end

    def confirm_lock
      @counter = @counter + 1
      false
    end
  end

  context 'custom locks' do

    it 'does not trigger when #confirm_lock returns false' do

      s = LosingLockScheduler.new

      count = 0

      s.in('0s') { count = count + 1 }

      sleep 0.7

      expect(count).to eq(0)
      expect(s.counter).to eq(1)
    end
  end
end

