
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  describe '#in' do

    it 'adds a job' do

      @scheduler.in(3600) do
      end

      expect(@scheduler.jobs.size).to eq(1)
      expect(@scheduler.jobs.first.class).to eq(Rufus::Scheduler::InJob)
    end

    it 'triggers a job' do

      a = false

      @scheduler.in(0.4) do
        a = true
      end

      sleep 0.9

      expect(a).to eq(true)
    end

    it 'removes the job after execution' do

      @scheduler.in(0.4) do
      end

      sleep 0.700

      expect(@scheduler.jobs.size).to eq(0)
    end
  end

  describe '#schedule_in' do

    it 'accepts a number' do

      job = @scheduler.schedule_in(3600) {}

      expect(job.original).to eq(3600)
    end

    it 'accepts a duration string' do

      job = @scheduler.schedule_in('1h') {}

      expect(job.original).to eq('1h')
      expect(job.time).to be >= job.scheduled_at + 3509
      expect(job.time).to be <= job.scheduled_at + 3601
    end

    it 'accepts an ActiveSupport .from_now thinggy'
      #
      #   schedule_in(2.days.from_now)
      #
      # that'd simply require "in" to be a bit like "at"...
  end
end

