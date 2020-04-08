
#
# Specifying rufus-scheduler
#
# Wed Aug  7 06:20:55 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  describe '#interval' do

    it 'adds a job' do

      @scheduler.interval(10) do
      end

      expect(@scheduler.jobs.size).to eq(1)
      expect(@scheduler.jobs.first.class).to eq(Rufus::Scheduler::IntervalJob)
    end

    it 'triggers a job (2 times)' do

      counter = 0

      @scheduler.interval(0.4) do
        counter += 1
      end

      sleep 2.0

      expect(counter).to be > 2
    end

    it 'triggers, but reschedules after the trigger execution' do

      chronos = []

      @scheduler.interval(0.4) do
        now = Time.now
        last, delta = chronos.last
        chronos << [ now, last ? now - last : nil ]
        sleep 0.5
      end

      t = Time.now
      sleep 0.1 while chronos.size < 4 && Time.now < t + 5

      expect(chronos.size).to eq(4)

      deltas = chronos.collect(&:last).compact

      #pp chronos
      #pp deltas

      deltas.each do |d|
        expect(d).to be >= 0.9
      end
    end

    it 'does not reschedule if the job was unscheduled' do

      counter = 0

      job =
        @scheduler.schedule_interval '0.5s' do
          counter = counter + 1
        end

      sleep 1.6

      expect(@scheduler.jobs(:all).size).to eq(1)

      job.unschedule
      c = counter

      sleep 1.6

      expect(counter).to eq(c)
      expect(@scheduler.jobs(:all).size).to eq(0)
    end

    it 'raises on negative intervals' do

      expect {
        @scheduler.interval(-1) do
        end
      }.to raise_error(ArgumentError)
    end

    it 'raises on zero intervals' do

      expect {
        @scheduler.interval(0) do
        end
      }.to raise_error(ArgumentError)
    end

    #it 'raises if the job frequency is higher than the scheduler frequency' do
    #
    #  @scheduler.frequency = 10
    #
    #  lambda {
    #    @scheduler.interval '1s' do; end
    #  }.should raise_error(ArgumentError)
    #end
  end

  describe '#schedule_interval' do

    it 'accepts a duration string' do

      job = @scheduler.schedule_interval('1h') do; end

      expect(job.interval).to eq(3600)
    end
  end
end

