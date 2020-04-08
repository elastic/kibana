
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler::RepeatJob do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  describe '#pause' do

    it 'pauses the job' do

      counter = 0

      job =
        @scheduler.schedule_every('0.5s') do
          counter += 1
        end

      expect(counter).to eq(0)

      while counter < 1; sleep(0.1); end

      job.pause

      sleep(1)

      expect(counter).to eq(1)
    end
  end

  describe '#paused?' do

    it 'returns true if the job is paused' do

      job = @scheduler.schedule_every('10s') do; end

      job.pause

      expect(job.paused?).to eq(true)
    end

    it 'returns false if the job is not paused' do

      job = @scheduler.schedule_every('10s') do; end

      expect(job.paused?).to eq(false)
    end
  end

  describe '#resume' do

    it 'resumes a paused job' do

      counter = 0

      job =
        @scheduler.schedule_every('0.5s') do
          counter += 1
        end

      job.pause
      job.resume

      sleep(1.5)

      expect(counter).to be > 1
    end

    it 'has no effect on a not paused job' do

      job = @scheduler.schedule_every('10s') do; end

      job.resume

      expect(job.paused?).to eq(false)
    end
  end

  describe ':times => i' do

    it 'lets a job unschedule itself after i times' do

      counter = 0

      job =
        @scheduler.schedule_every '0.5s', :times => 3 do
          counter = counter + 1
        end

      sleep(2.6)

      expect(counter).to eq(3)
    end

    it 'is OK when passed a nil instead of an integer' do

      counter = 0

      job =
        @scheduler.schedule_every '0.5s', :times => nil do
          counter = counter + 1
        end

      sleep(2.5)

      expect(counter).to be > 3
    end

    it 'raises when passed something else than nil or an integer' do

      expect {
        @scheduler.schedule_every '0.5s', :times => 'nada' do; end
      }.to raise_error(ArgumentError)
    end
  end

  describe ':first/:first_in/:first_at => point in time' do

    it 'accepts a Time instance' do

      t = Time.now + 10

      job = @scheduler.schedule_every '0.5s', :first => t do; end

      expect(job.first_at).to eq(t)
    end

    it 'accepts a time string' do

      t = Time.now + 10

      job = @scheduler.schedule_every '0.5s', :first => t.to_s do; end

      expect(job.first_at.to_s).to eq(t.to_s)
      expect(job.first_at.zone).to eq(t.zone)
    end

    it 'only lets the job trigger after the :first' do

      t = Time.now + 1.4
      counter = 0

      job =
        @scheduler.schedule_every '0.5s', :first => t do
          counter = counter + 1
        end

      sleep(1)

      expect(counter).to eq(0)

      sleep(1)

      expect(counter).to be > 0
    end

    it 'raises on points in the past' do

      expect {

        @scheduler.schedule_every '0.5s', :first => Time.now - 60 do; end

      }.to raise_error(ArgumentError)
    end

    context ':first_time => :now/:immediately' do

      it 'schedules the first execution immediately' do

        n = Time.now
        ft = nil

        job =
          @scheduler.schedule_every '7s', :first => :now do
            ft ||= Time.now
          end

        sleep 0.7

        #p n.to_f
        #p job.first_at.to_f
        #p ft.to_f

        expect(job.first_at).to be < n + 0.7
        expect(ft).to be < job.first_at + @scheduler.frequency + 0.1
      end
    end
  end

  describe ':first/:first_in/:first_at => duration' do

    it 'accepts a duration string' do

      t = Time.now

      job = @scheduler.schedule_every '0.5s', :first => '1h' do; end

      expect(job.first_at).to be >= t + 3600
      expect(job.first_at).to be < t + 3601
    end

    it 'accepts a duration in seconds (integer)' do

      t = Time.now

      job = @scheduler.schedule_every '0.5s', :first => 3600 do; end

      expect(job.first_at).to be >= t + 3600
      expect(job.first_at).to be < t + 3601
    end

    it 'raises if the argument cannot be used' do

      expect {
        @scheduler.every '0.5s', :first => :nada do; end
      }.to raise_error(ArgumentError)
    end
  end

  describe '#first_at=' do

    it 'can be used to set first_at directly' do

      job = @scheduler.schedule_every '0.5s', :first => 3600 do; end
      job.first_at = '2030-12-12 12:00:30'

      expect(job.first_at.strftime('%c')).to eq('Thu Dec 12 12:00:30 2030')
    end
  end

  describe ':last/:last_in/:last_at => point in time' do

    it 'accepts a Time instance' do

      t = Time.now + 10

      job = @scheduler.schedule_every '0.5s', :last => t do; end

      expect(job.last_at).to eq(t)
    end

    it 'unschedules the job after the last_at time' do

      t = Time.now + 2

      counter = 0
      tt = nil

      job =
        @scheduler.schedule_every '0.5s', :last => t do
          counter = counter + 1
          tt = Time.now
        end

      sleep 3

      #counter.should == 3
      expect([ 3, 4 ]).to include(counter)
      expect(tt).to be < t
      expect(@scheduler.jobs).not_to include(job)
    end

    it 'accepts a time string' do

      t = Time.now + 10

      job = @scheduler.schedule_every '0.5s', :last => t.to_s do; end

      expect(job.last_at.to_s).to eq(t.to_s)
      expect(job.last_at.zone).to eq(t.zone)
    end

    it 'raises on a point in the past' do

      expect {

        @scheduler.every '0.5s', :last => Time.now - 60 do; end

      }.to raise_error(ArgumentError)
    end
  end

  describe ':last/:last_in/:last_at => duration' do

    it 'accepts a duration string' do

      t = Time.now

      job = @scheduler.schedule_every '0.5s', :last_in => '2s' do; end

      expect(job.last_at).to be >= t + 2
      expect(job.last_at).to be < t + 2.5
    end

    it 'accepts a duration in seconds (integer)' do

      t = Time.now

      job = @scheduler.schedule_every '0.5s', :last_in => 2.0 do; end

      expect(job.last_at).to be >= t + 2
      expect(job.last_at).to be < t + 2.5
    end

    it 'raises if the argument is worthless' do

      expect {
        @scheduler.every '0.5s', :last => :nada do; end
      }.to raise_error(ArgumentError)
    end
  end

  describe '#last_at=' do

    it 'can be used to set last_at directly' do

      job = @scheduler.schedule_every '0.5s', :last_in => 10.0 do; end
      job.last_at = '2030-12-12 12:00:30'

      expect(job.last_at.strftime('%c')).to eq('Thu Dec 12 12:00:30 2030')
    end
  end

  describe '#count' do

    it 'starts at 0' do

      job = @scheduler.schedule_every '5m' do; end

      expect(job.count).to eq(0)
    end

    it 'keeps track of how many times the job fired' do

      job = @scheduler.schedule_every '0.5s' do; end

      sleep(2.0)

      expect(job.count).to be >= 3
      expect(job.count).to be <= 4
    end
  end
end

