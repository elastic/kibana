
#
# Specifying rufus-scheduler
#
# Thu Jul 25 05:53:51 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  context 'thread pool' do

    it 'starts with an empty thread pool' do

      expect(@scheduler.work_threads.size).to eq(0)
    end

    it 'does not cross the max_work_threads threshold' do

      #@scheduler.min_work_threads = 2
      @scheduler.max_work_threads = 5

      10.times do
        @scheduler.in '0s' do
          sleep 5
        end
      end

      sleep 0.5

      #@scheduler.job_threads.each do |t|
      #  p t.keys
      #  p t[:rufus_scheduler_job].class
      #end

      expect(@scheduler.work_threads.size).to eq(5)
    end

    it 'does not cross the max_work_threads threshold (overlap: false)' do

      #@scheduler.min_work_threads = 2
      @scheduler.max_work_threads = 5

      10.times do
        @scheduler.in '0s', :overlap => false do
          sleep 5
        end
      end

      sleep 0.5

      #@scheduler.job_threads.each do |t|
      #  p t.keys
      #  p t[:rufus_scheduler_job].class
      #end

      expect(@scheduler.work_threads.size).to eq(5)
    end

    it 'does not execute unscheduled jobs' do

      @scheduler.max_work_threads = 1

      counter = 0

      job0 =
        @scheduler.schedule_in '0.3s' do
          counter += 1
          sleep 1
        end
      job1 =
        @scheduler.schedule_in '0.35s' do
          counter += 1
          sleep 1
        end

      sleep(0.1) while counter < 1
      sleep(0.1) while @scheduler.work_queue.size < 1
      job1.unschedule

      sleep(2)

      expect(counter).to eq(1)
    end
  end
end

