
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  describe '#initialize' do

    it 'starts the scheduler thread' do

      scheduler = Rufus::Scheduler.new

      t = Thread.list.find { |t|
        t[:name] == "rufus_scheduler_#{scheduler.object_id}_scheduler"
      }

      expect(t[:rufus_scheduler]).to eq(scheduler)
    end

    it 'sets :name and :rufus_scheduler in the scheduler thread local vars' do

      scheduler = Rufus::Scheduler.new

      expect(scheduler.thread[:name]).to eq(
        "rufus_scheduler_#{scheduler.object_id}_scheduler"
      )
      expect(scheduler.thread[:rufus_scheduler]).to eq(
        scheduler
      )
    end

    it 'accepts a :frequency => integer option' do

      scheduler = Rufus::Scheduler.new(:frequency => 2)

      expect(scheduler.frequency).to eq(2)
    end

    it 'accepts a :frequency => "2h1m" option' do

      scheduler = Rufus::Scheduler.new(:frequency => '2h1m')

      expect(scheduler.frequency).to eq(3600 * 2 + 60)
    end

    it 'accepts a :thread_name option' do

      scheduler = Rufus::Scheduler.new(:thread_name => 'oliphant')

      t = Thread.list.find { |t| t[:name] == 'oliphant' }

      expect(t[:rufus_scheduler]).to eq(scheduler)
    end

    #it 'accepts a :min_work_threads option' do
    #  scheduler = Rufus::Scheduler.new(:min_work_threads => 9)
    #  scheduler.min_work_threads.should == 9
    #end

    it 'accepts a :max_work_threads option' do

      scheduler = Rufus::Scheduler.new(:max_work_threads => 9)

      expect(scheduler.max_work_threads).to eq(9)
    end
  end

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  describe 'a schedule method' do

    it 'passes the job to its block when it triggers' do

      j = nil
      job = @scheduler.schedule_in('0s') { |jj| j = jj }

      sleep 0.4

      expect(j).to eq(job)
    end

    it 'passes the trigger time as second block argument' do

      t = nil
      @scheduler.schedule_in('0s') { |jj, tt| t = tt }

      sleep 0.4

      expect(t.class).to eq(Time)
    end

    class MyHandler
      attr_reader :counter
      def initialize
        @counter = 0
      end
      def call(job, time)
        @counter = @counter + 1
      end
    end

    it 'accepts a callable object instead of a block' do

      mh = MyHandler.new

      @scheduler.schedule_in('0s', mh)

      sleep 0.4

      expect(mh.counter).to eq(1)
    end

    class MyOtherHandler
      attr_reader :counter
      def initialize
        @counter = 0
      end
      def call
        @counter = @counter + 1
      end
    end

    it 'accepts a callable obj instead of a block (#call with no args)' do

      job = @scheduler.schedule_in('0s', MyOtherHandler.new)

      sleep 0.4

      expect(job.handler.counter).to eq(1)
    end

    it 'accepts a class as callable' do

      job =
        @scheduler.schedule_in('0s', Class.new do
          attr_reader :value
          def call
            @value = 7
          end
        end)

      sleep 0.4

      expect(job.handler.value).to eq(7)
    end

    it 'raises if the scheduler is shutting down' do

      @scheduler.shutdown

      expect {
        @scheduler.in('0s') { puts 'hhhhhhhhhhhello!!' }
      }.to raise_error(Rufus::Scheduler::NotRunningError)
    end
  end

  describe '#in / #at' do

    # scheduler.in(2.hours.from_now) { ... }

    it 'accepts point in time and duration indifferently (#in)' do

      seen = false

      t = Time.now + 1

      @scheduler.in(t) { seen = true }

      sleep 0.1 while seen != true
    end

    it 'accepts point in time and duration indifferently (#at)' do

      seen = false

      t = 1

      @scheduler.at(t) { seen = true }

      sleep 0.1 while seen != true
    end
  end

  describe '#schedule' do

    it 'accepts a duration and schedules an InJob' do

      j = @scheduler.schedule '1s' do; end

      expect(j.class).to eq(Rufus::Scheduler::InJob)
      expect(j.original).to eq('1s')
    end

    it 'accepts a point in time and schedules an AtJob' do

      j = @scheduler.schedule '2070/12/24 23:00' do; end

      expect(j.class).to eq(Rufus::Scheduler::AtJob)
      expect(j.next_time.strftime('%Y %m %d')).to eq('2070 12 24')
    end

    it 'accepts a cron string and schedules a CronJob' do

      j = @scheduler.schedule '* * * * *' do; end

      expect(j.class).to eq(Rufus::Scheduler::CronJob)
    end
  end

  describe '#repeat' do

    it 'accepts a duration and schedules an EveryJob' do

      j = @scheduler.repeat '1s' do; end

      expect(j.class).to eq(Rufus::Scheduler::EveryJob)
    end

    it 'accepts a cron string and schedules a CronJob' do

      j = @scheduler.repeat '* * * * *' do; end

      expect(j.class).to eq(Rufus::Scheduler::CronJob)
    end
  end

  describe '#unschedule(job_or_work_id)' do

    it 'accepts job ids' do

      job = @scheduler.schedule_in '10d' do; end

      expect(job.unscheduled_at).to eq(nil)

      @scheduler.unschedule(job.id)

      expect(job.unscheduled_at).not_to eq(nil)
    end

    it 'accepts jobs' do

      job = @scheduler.schedule_in '10d' do; end

      expect(job.unscheduled_at).to eq(nil)

      @scheduler.unschedule(job)

      expect(job.unscheduled_at).not_to eq(nil)
    end

    it 'carefully unschedules repeat jobs' do

      counter = 0

      job =
        @scheduler.schedule_every '0.5s' do
          counter = counter + 1
        end

      sleep 1.5
      c = counter

      @scheduler.unschedule(job)

      sleep 1.5
      expect(counter).to eq(c)
    end
  end

  describe '#uptime' do

    it 'returns the uptime as a float' do

      expect(@scheduler.uptime).to be >= 0.0
    end
  end

  describe '#uptime_s' do

    it 'returns the uptime as a human readable string' do

      sleep 1

      expect(@scheduler.uptime_s).to match(/^[12]s\d+$/)
    end
  end

  describe '#join' do

    it 'joins the scheduler thread' do

      t = Thread.new { @scheduler.join; Thread.current['a'] = 'over' }

      expect(t['a']).to eq(nil)

      @scheduler.shutdown

      sleep(1)

      expect(t['a']).to eq('over')
    end
  end

  describe '#job(job_id)' do

    it 'returns nil if there is no corresponding Job instance' do

      expect(@scheduler.job('nada')).to eq(nil)
    end

    it 'returns the corresponding Job instance' do

      job_id = @scheduler.in '10d' do; end

      sleep(1) # give it some time to get scheduled

      expect(@scheduler.job(job_id).job_id).to eq(job_id)
    end
  end

#    describe '#find_by_tag(t)' do
#
#      it 'returns an empty list when there are no jobs with the given tag' do
#
#        @scheduler.find_by_tag('nada').should == []
#      end
#
#      it 'returns all the jobs with the given tag' do
#
#        @scheduler.in '10d', :tag => 't0' do; end
#        @scheduler.every '2h', :tag => %w[ t0 t1 ] do; end
#        @scheduler.every '3h' do; end
#
#        @scheduler.find_by_tag('t0').map(&:original).should ==
#          %w[ 2h 10d ]
#        @scheduler.find_by_tag('t1').map(&:original).should ==
#          %w[ 2h ]
#        @scheduler.find_by_tag('t1', 't0').map(&:original).sort.should ==
#          %w[ 2h ]
#      end
#    end

  describe '#threads' do

    it 'just lists the main thread (scheduler thread) when no job is scheduled' do

      expect(@scheduler.threads).to eq([ @scheduler.thread ])
    end

    it 'lists all the threads a scheduler uses' do

      @scheduler.in '0s' do
        sleep(2)
      end

      sleep 0.4

      expect(@scheduler.threads.size).to eq(2)
    end
  end

  describe '#work_threads(:all | :vacant)' do

    it 'returns an empty array when the scheduler has not yet done anything' do

      expect(@scheduler.work_threads).to eq([])
      expect(@scheduler.work_threads(:all)).to eq([])
      expect(@scheduler.work_threads(:vacant)).to eq([])
    end

    it 'lists the [vacant] work threads in the pool' do

      @scheduler.in '0s' do
        sleep(0.2)
      end
      @scheduler.in '0s' do
        sleep(2.0)
      end

      sleep 0.7

      if @scheduler.work_threads.size == 1
        expect(@scheduler.work_threads.size).to eq(1)
        expect(@scheduler.work_threads(:all).size).to eq(1)
        expect(@scheduler.work_threads(:vacant).size).to eq(0)
      else
        expect(@scheduler.work_threads.size).to eq(2)
        expect(@scheduler.work_threads(:all).size).to eq(2)
        expect(@scheduler.work_threads(:vacant).size).to eq(1)
      end
    end
  end

  describe '#work_threads(:active)' do

    it 'returns [] when there are no jobs running' do

      expect(@scheduler.work_threads(:active)).to eq([])
    end

    it 'returns the list of threads of the running jobs' do

      job =
        @scheduler.schedule_in('0s') do
          sleep 1
        end

      sleep 0.4

      expect(@scheduler.work_threads(:active).size).to eq(1)

      t = @scheduler.work_threads(:active).first

      expect(t.class).to eq(Thread)
      expect(t[@scheduler.thread_key]).to eq(true)
      expect(t[:rufus_scheduler_job]).to eq(job)
      expect(t[:rufus_scheduler_time]).not_to eq(nil)
    end

    it 'does not return threads from other schedulers' do

      scheduler = Rufus::Scheduler.new

      job =
        @scheduler.schedule_in('0s') do
          sleep(1)
        end

      sleep 0.4

      expect(scheduler.work_threads(:active)).to eq([])

      scheduler.shutdown
    end
  end

  #describe '#min_work_threads' do
  #  it 'returns the min job thread count' do
  #    @scheduler.min_work_threads.should == 3
  #  end
  #end
  #describe '#min_work_threads=' do
  #  it 'sets the min job thread count' do
  #    @scheduler.min_work_threads = 1
  #    @scheduler.min_work_threads.should == 1
  #  end
  #end

  describe '#max_work_threads' do

    it 'returns the max job thread count' do

      expect(@scheduler.max_work_threads).to eq(28)
    end
  end

  describe '#max_work_threads=' do

    it 'sets the max job thread count' do

      @scheduler.max_work_threads = 14

      expect(@scheduler.max_work_threads).to eq(14)
    end
  end

  #describe '#kill_all_work_threads' do
  #
  #  it 'kills all the work threads' do
  #
  #    @scheduler.in '0s' do; sleep(5); end
  #    @scheduler.in '0s' do; sleep(5); end
  #    @scheduler.in '0s' do; sleep(5); end
  #
  #    sleep 0.5
  #
  #    @scheduler.work_threads.size.should == 3
  #
  #    @scheduler.send(:kill_all_work_threads)
  #
  #    sleep 0.5
  #
  #    @scheduler.work_threads.size.should == 0
  #  end
  #end

  describe '#running_jobs' do

    it 'returns [] when there are no running jobs' do

      expect(@scheduler.running_jobs).to eq([])
    end

    it 'returns a list of running Job instances' do

      job =
        @scheduler.schedule_in('0s') do
          sleep(1)
        end

      sleep 0.4

      expect(job.running?).to eq(true)
      expect(@scheduler.running_jobs).to eq([ job ])
    end

    it 'does not return twice the same job' do

      job =
        @scheduler.schedule_every('0.3s') do
          sleep(5)
        end

      sleep 1.5

      expect(job.running?).to eq(true)
      expect(@scheduler.running_jobs).to eq([ job ])
    end
  end

  describe '#running_jobs(:tag/:tags => x)' do

    it 'returns a list of running jobs filtered by tag' do

      @scheduler.in '0.1s', :tag => 't0' do
        sleep 3
      end
      @scheduler.in '0.2s', :tag => 't1' do
        sleep 3
      end

      sleep 0.49

      expect(@scheduler.running_jobs(:tag => 't0').map(&:original)).to eq(
        %w[ 0.1s ]
      )
      expect(@scheduler.running_jobs(:tag => 't1').map(&:original)).to eq(
        %w[ 0.2s ]
      )
      expect(@scheduler.running_jobs(:tags => %w[ t0 t1 ]).map(&:original)).to eq(
        []
      )
    end
  end

  describe '#occurrences(time0, time1)' do

    it 'returns a { job => [ times ] } of job occurrences' do

      j0 = @scheduler.schedule_in '7m' do; end
      j1 = @scheduler.schedule_at '10m' do; end
      j2 = @scheduler.schedule_every '5m' do; end
      j3 = @scheduler.schedule_interval '5m' do; end
      j4 = @scheduler.schedule_cron '* * * * *' do; end

      h = @scheduler.occurrences(Time.now + 4 * 60, Time.now + 11 * 60)

      expect(h.size).to eq(5)
      expect(h[j0]).to eq([ j0.next_time ])
      expect(h[j1]).to eq([ j1.next_time ])
      expect(h[j2].size).to eq(2)
      expect(h[j3].size).to eq(2)
      expect(h[j4].size).to eq(7)
    end

    it 'returns a [ [ time, job ], ... ] of job occurrences when :timeline' do

      j0 = @scheduler.schedule_in '5m' do; end
      j1 = @scheduler.schedule_in '10m' do; end

      a =
        @scheduler.occurrences(Time.now + 4 * 60, Time.now + 11 * 60, :timeline)

      expect(a[0][0]).to be_within_1s_of(Time.now + 5 * 60)
      expect(a[0][1]).to eq(j0)
      expect(a[1][0]).to be_within_1s_of(Time.now + 10 * 60)
      expect(a[1][1]).to eq(j1)
    end

    it 'respects :first_at for repeat jobs' do

      j0 = @scheduler.schedule_every '5m', :first_in => '10m' do; end

      h = @scheduler.occurrences(Time.now + 4 * 60, Time.now + 16 * 60)

      expect(h[j0][0]).to be_within_1s_of(Time.now + 10 * 60)
      expect(h[j0][1]).to be_within_1s_of(Time.now + 15 * 60)
    end

    it 'respects :times for repeat jobs' do

      j0 = @scheduler.schedule_every '1m', :times => 10 do; end

      h = @scheduler.occurrences(Time.now + 4 * 60, Time.now + 16 * 60)

      expect(h[j0].size).to eq(6)
    end
  end

  describe '#timeline(time0, time1)' do

    it 'returns a [ [ time, job ], ... ] of job occurrences' do

      j0 = @scheduler.schedule_in '5m' do; end
      j1 = @scheduler.schedule_in '10m' do; end

      a = @scheduler.timeline(Time.now + 4 * 60, Time.now + 11 * 60)

      expect(a[0][0]).to be_within_1s_of(Time.now + 5 * 60)
      expect(a[0][1]).to eq(j0)
      expect(a[1][0]).to be_within_1s_of(Time.now + 10 * 60)
      expect(a[1][1]).to eq(j1)
    end
  end

  #--
  # management methods
  #++

  describe '#shutdown' do

    it 'blanks the uptime' do

      @scheduler.shutdown

      expect(@scheduler.uptime).to eq(nil)
    end

    it 'shuts the scheduler down' do

      @scheduler.shutdown

      sleep 0.100
      sleep 0.400 if RUBY_VERSION < '1.9.0'

      t = Thread.list.find { |t|
        t[:name] == "rufus_scheduler_#{@scheduler.object_id}"
      }

      expect(t).to eq(nil)
    end

    it 'has a #stop alias' do

      @scheduler.stop

      expect(@scheduler.uptime).to eq(nil)
    end

    #it 'has a #close alias'
  end

  describe '#shutdown(:wait)' do

    it 'shuts down and blocks until all the jobs ended their current runs' do

      counter = 0

      @scheduler.in '0s' do
        sleep 1
        counter = counter + 1
      end

      sleep 0.4

      @scheduler.shutdown(:wait)

      expect(counter).to eq(1)
      expect(@scheduler.uptime).to eq(nil)
      expect(@scheduler.running_jobs).to eq([])
      expect(@scheduler.threads).to eq([])
    end
  end

  describe '#shutdown(:kill)' do

    it 'kills all the jobs and then shuts down' do

      counter = 0

      @scheduler.in '0s' do
        sleep 1
        counter = counter + 1
      end
      @scheduler.at Time.now + 0.3 do
        sleep 1
        counter = counter + 1
      end

      sleep 0.4

      @scheduler.shutdown(:kill)

      sleep 1.4

      expect(counter).to eq(0)
      expect(@scheduler.uptime).to eq(nil)
      expect(@scheduler.running_jobs).to eq([])
      expect(@scheduler.threads).to eq([])
    end
  end

  describe '#pause' do

    it 'pauses the scheduler' do

      job = @scheduler.schedule_in '1s' do; end

      @scheduler.pause

      sleep(3)

      expect(job.last_time).to eq(nil)
    end
  end

  describe '#resume' do

    it 'works' do

      job = @scheduler.schedule_in '2s' do; end

      @scheduler.pause
      sleep(1)
      @scheduler.resume
      sleep(2)

      expect(job.last_time).not_to eq(nil)
    end
  end

  describe '#paused?' do

    it 'returns true if the scheduler is paused' do

      @scheduler.pause
      expect(@scheduler.paused?).to eq(true)
    end

    it 'returns false if the scheduler is not paused' do

      expect(@scheduler.paused?).to eq(false)

      @scheduler.pause
      @scheduler.resume

      expect(@scheduler.paused?).to eq(false)
    end
  end

  describe '#down?' do

    it 'returns true when the scheduler is down' do

      @scheduler.shutdown

      expect(@scheduler.down?).to eq(true)
    end

    it 'returns false when the scheduler is up' do

      expect(@scheduler.down?).to eq(false)
    end
  end

  describe '#up?' do

    it 'returns true when the scheduler is up' do

      expect(@scheduler.up?).to eq(true)
    end
  end

  #--
  # job methods
  #++

  describe '#jobs' do

    it 'is empty at the beginning' do

      expect(@scheduler.jobs).to eq([])
    end

    it 'returns the list of scheduled jobs' do

      @scheduler.in '10d' do; end
      @scheduler.in '1w' do; end

      sleep(1)

      jobs = @scheduler.jobs

      expect(jobs.collect { |j| j.original }.sort).to eq(%w[ 10d 1w ])
    end

    it 'returns all the jobs (even those pending reschedule)' do

      @scheduler.in '0s', :blocking => true do
        sleep 2
      end

      sleep 0.4

      expect(@scheduler.jobs.size).to eq(1)
    end

    it 'does not return unscheduled jobs' do

      job =
        @scheduler.schedule_in '0s', :blocking => true do
          sleep 2
        end

      sleep 0.4

      job.unschedule

      expect(@scheduler.jobs.size).to eq(0)
    end
  end

  describe '#jobs(:tag / :tags => x)' do

    it 'returns [] when there are no jobs with the corresponding tag' do

      expect(@scheduler.jobs(:tag => 'nada')).to eq([])
      expect(@scheduler.jobs(:tags => %w[ nada hello ])).to eq([])
    end

    it 'returns the jobs with the corresponding tag' do

      @scheduler.in '10d', :tag => 't0' do; end
      @scheduler.every '2h', :tag => %w[ t0 t1 ] do; end
      @scheduler.every '3h' do; end

      expect(@scheduler.jobs(:tags => 't0').map(&:original).sort).to eq(
        %w[ 10d 2h ]
      )
      expect(@scheduler.jobs(:tags => 't1').map(&:original).sort).to eq(
        %w[ 2h ]
      )
      expect(@scheduler.jobs(:tags => [ 't1', 't0' ]).map(&:original).sort).to eq(
        %w[ 2h ]
      )
    end
  end

  describe '#every_jobs' do

    it 'returns EveryJob instances' do

      @scheduler.at '2030/12/12 12:10:00' do; end
      @scheduler.in '10d' do; end
      @scheduler.every '5m' do; end

      jobs = @scheduler.every_jobs

      expect(jobs.collect { |j| j.original }.sort).to eq(%w[ 5m ])
    end
  end

  describe '#at_jobs' do

    it 'returns AtJob instances' do

      @scheduler.at '2030/12/12 12:10:00' do; end
      @scheduler.in '10d' do; end
      @scheduler.every '5m' do; end

      jobs = @scheduler.at_jobs

      expect(jobs.collect { |j| j.original }.sort).to eq([ '2030/12/12 12:10:00' ])
    end
  end

  describe '#in_jobs' do

    it 'returns InJob instances' do

      @scheduler.at '2030/12/12 12:10:00' do; end
      @scheduler.in '10d' do; end
      @scheduler.every '5m' do; end

      jobs = @scheduler.in_jobs

      expect(jobs.collect { |j| j.original }.sort).to eq(%w[ 10d ])
    end
  end

  describe '#cron_jobs' do

    it 'returns CronJob instances' do

      @scheduler.at '2030/12/12 12:10:00' do; end
      @scheduler.in '10d' do; end
      @scheduler.every '5m' do; end
      @scheduler.cron '* * * * *' do; end

      jobs = @scheduler.cron_jobs

      expect(jobs.collect { |j| j.original }.sort).to eq([ '* * * * *' ])
    end
  end

  describe '#interval_jobs' do

    it 'returns IntervalJob instances' do

      @scheduler.at '2030/12/12 12:10:00' do; end
      @scheduler.in '10d' do; end
      @scheduler.every '5m' do; end
      @scheduler.cron '* * * * *' do; end
      @scheduler.interval '7m' do; end

      jobs = @scheduler.interval_jobs

      expect(jobs.collect { |j| j.original }.sort).to eq(%w[ 7m ])
    end
  end

  #--
  # callbacks
  #++

  describe '#on_pre_trigger' do

    it 'is called right before a job triggers' do

      $out = []

      def @scheduler.on_pre_trigger(job)
        $out << "pre #{job.id}"
      end

      job_id =
        @scheduler.in '0.5s' do |job|
          $out << job.id
        end

      sleep 0.7

      expect($out).to eq([ "pre #{job_id}", job_id ])
    end

    it 'accepts the job and the triggerTime as argument' do

      $tt = nil

      def @scheduler.on_pre_trigger(job, trigger_time)
        $tt = trigger_time
      end

      start = Time.now

      @scheduler.in '0.5s' do; end

      sleep 0.7

      expect($tt.class).to eq(Time)
      expect($tt).to be > start
      expect($tt).to be < Time.now
    end

    context 'when it returns false' do

      it 'prevents the job from triggering' do

        $out = []

        def @scheduler.on_pre_trigger(job)
          $out << "pre #{job.id}"
          false
        end

        job_id =
          @scheduler.in '0.5s' do |job|
            $out << job.id
          end

        sleep 0.7

        expect($out).to eq([ "pre #{job_id}" ])
      end
    end
  end

  describe '#on_post_trigger' do

    it 'is called right after a job triggers' do

      $out = []

      def @scheduler.on_post_trigger(job)
        $out << "post #{job.id}"
      end

      job_id =
        @scheduler.in '0.5s' do |job|
          $out << job.id
        end

      sleep 0.7

      expect($out).to eq([ job_id, "post #{job_id}" ])
    end
  end

  #--
  # misc
  #++

  describe '.singleton / .s' do

    before(:each) do

      Rufus::Scheduler.class_eval { @singleton = nil } # ;-)
    end

    it 'returns a singleton instance of the scheduler' do

      s0 = Rufus::Scheduler.singleton
      s1 = Rufus::Scheduler.s

      expect(s0.class).to eq(Rufus::Scheduler)
      expect(s1.object_id).to eq(s0.object_id)
    end

    it 'accepts initialization parameters' do

      s = Rufus::Scheduler.singleton(:max_work_threads => 77)
      s = Rufus::Scheduler.singleton(:max_work_threads => 42)

      expect(s.max_work_threads).to eq(77)
    end
  end
end

