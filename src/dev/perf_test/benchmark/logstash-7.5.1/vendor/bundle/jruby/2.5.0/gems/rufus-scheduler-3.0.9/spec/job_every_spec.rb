
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler::EveryJob do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  it 'triggers as expected' do

    counter = 0

    @scheduler.every '1s' do
      counter = counter + 1
    end

    sleep 3.5

    expect([ 2, 3 ]).to include(counter)
  end

  it 'lets its @next_time change in-flight' do

    times = []

    @scheduler.every '1s' do |job|
      times << Time.now
      job.next_time = Time.now + 3 if times.count == 2
    end

    sleep 0.3 while times.count < 3

    #p [ times[1] - times[0], times[2] - times[1] ]

    expect(times[1] - times[0]).to be > 1.0
    expect(times[1] - times[0]).to be < 1.4
    expect(times[2] - times[1]).to be > 3.0
    expect(times[2] - times[1]).to be < 3.4
  end

  context 'first_at/in' do

    it 'triggers for the first time at first_at' do

      t = Time.now

      job = @scheduler.schedule_every '3s', :first_in => '1s' do; end

      sleep 2

      #p [ t, t.to_f ]
      #p [ job.last_time, job.last_time.to_f ]
      #p [ job.first_at, job.first_at.to_f ]

      expect(job.first_at).to be_within_1s_of(t + 2)
      expect(job.last_time).to be_within_1s_of(job.first_at)
    end

    describe '#first_at=' do

      it 'alters @next_time' do

        job = @scheduler.schedule_every '3s', :first_in => '10s' do; end

        fa0 = job.first_at
        nt0 = job.next_time

        job.first_at = Time.now + 3

        fa1 = job.first_at
        nt1 = job.next_time

        expect(nt0).to eq(fa0)
        expect(nt1).to eq(fa1)
      end
    end
  end
end

