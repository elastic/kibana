
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

  describe '#at' do

    it 'raises if the block to schedule is missing' do

      expect {
        @scheduler.at(Time.now + 3600)
      }.to raise_error(ArgumentError)
    end

    it 'returns a job id' do

      job_id =
        @scheduler.at(Time.now + 3600) do
        end

      expect(job_id.class).to eq(String)
      expect(job_id).to match(/^at_/)
    end

    it 'returns a job if :job => true' do

      job =
        @scheduler.at(Time.now + 3600, :job => true) do
        end

      expect(job.class).to eq(Rufus::Scheduler::AtJob)
    end

    it 'adds a job' do

      t = Time.now + 3600

      @scheduler.at(t) do
      end

      expect(@scheduler.jobs.size).to eq(1)
      expect(@scheduler.jobs.first.class).to eq(Rufus::Scheduler::AtJob)
      expect(@scheduler.jobs.first.time).to eq(t)
    end

    it 'triggers a job' do

      a = false

      @scheduler.at(Time.now + 0.100) do
        a = true
      end

      sleep 0.4

      expect(a).to eq(true)
    end

    it 'removes the job after execution' do

      @scheduler.at(Time.now + 0.100) do
      end

      sleep 0.4

      expect(@scheduler.jobs.size).to eq(0)
    end

    it 'accepts a Time instance' do

      t = Time.now + 3600

      job = @scheduler.at(t, :job => true) {}

      expect(job.time).to eq(t)
    end

    it 'accepts a time string' do

      job = @scheduler.at('2100-12-12 20:30', :job => true) {}

      expect(job.time).to eq(Time.parse('2100-12-12 20:30'))
    end

    it 'accepts a time string with a delta timezone' do

      job = @scheduler.at('2100-12-12 20:30 -0200', :job => true) {}

      expect(job.time).to eq(Time.parse('2100-12-12 20:30 -0200'))
    end

    it 'accepts a time string with a named timezone' do

      job = @scheduler.at('2050-12-12 20:30 Europe/Berlin', :job => true) {}

      expect(job.time.strftime('%c %z')).to eq('Mon Dec 12 19:30:00 2050 +0000')
    end

    it 'accepts a Chronic string (if Chronic is present)' do

      with_chronic do

        job = @scheduler.schedule_at('next tuesday at 12:00') {}

        expect(job.time.wday).to eq(2)
        expect(job.time.hour).to eq(12)
        expect(job.time.min).to eq(0)
        expect(job.time).to be > Time.now
      end
    end

    it 'accepts a Chronic string and Chronic options (if Chronic present)' do

      with_chronic do

        job =
          @scheduler.schedule_at(
            'may 27th at 12:00', :now => Time.local(Time.now.year + 2, 1, 1)
          ) {}

        expect(job.time.year).to eq(Time.now.year + 2)
        expect(job.time.month).to eq(5)
        expect(job.time.day).to eq(27)
        expect(job.time.hour).to eq(12)
        expect(job.time.min).to eq(0)
      end
    end

    it 'accepts an ActiveSupport time thinggy'
  end

  describe '#schedule_at' do

    it 'returns a job' do

      job = @scheduler.schedule_at(Time.now + 3600) do
      end

      expect(job.class).to eq(Rufus::Scheduler::AtJob)
      expect(job.id).to match(/^at_/)
    end
  end
end

