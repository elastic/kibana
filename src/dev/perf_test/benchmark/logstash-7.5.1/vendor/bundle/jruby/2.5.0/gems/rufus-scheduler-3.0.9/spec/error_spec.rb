
#
# Specifying rufus-scheduler
#
# Fri Aug  9 07:10:18 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  before :each do

    @taoe = Thread.abort_on_exception
    Thread.abort_on_exception = false

    @ose = $stderr
    $stderr = StringIO.new

    @scheduler = Rufus::Scheduler.new
  end

  after :each do

    @scheduler.shutdown

    Thread.abort_on_exception = @taoe

    $stderr = @ose
  end

  context 'error in block' do

    it 'intercepts the error and describes it on $stderr' do

      counter = 0

      @scheduler.every('0.5s') do
        counter += 1
        fail 'argh'
      end

      sleep 2

      expect(counter).to be > 2
      expect($stderr.string).to match(/argh/)
    end
  end

  context 'error in callable' do

    class MyFailingHandler
      attr_reader :counter
      def initialize
        @counter = 0
      end
      def call(job, time)
        @counter = @counter + 1
        fail 'ouch'
      end
    end

    it 'intercepts the error and describes it on $stderr' do

      mfh = MyFailingHandler.new

      @scheduler.every('0.5s', mfh)

      sleep 2

      expect(mfh.counter).to be > 2
      expect($stderr.string).to match(/ouch/)
    end
  end

  context 'Rufus::Scheduler#stderr=' do

    it 'lets divert error information to custom files' do

      @scheduler.stderr = StringIO.new

      @scheduler.in('0s') do
        fail 'miserably'
      end

      sleep 0.5

      expect(@scheduler.stderr.string).to match(/intercepted an error/)
      expect(@scheduler.stderr.string).to match(/miserably/)
    end
  end

  context 'error information' do

    it 'contains information about the error, the job and the scheduler' do

      @scheduler.stderr = StringIO.new

      @scheduler.in('0s') do
        fail 'miserably'
      end

      sleep 0.5

      s = @scheduler.stderr.string
      #puts s

      expect(s).to match(/ENV\['TZ'\]:/)
      expect(s).to match(/down\?: false/)
      expect(s).to match(/work_threads: 1/)
      expect(s).to match(/running_jobs: 1/)
      expect(s).to match(/uptime: \d/)
    end
  end

  context 'Rufus::Scheduler#on_error(&block)' do

    it 'intercepts all StandardError instances' do

      $message = nil

      def @scheduler.on_error(job, err)
        $message = "#{job.class} #{job.original} #{err.message}"
      rescue
        p $!
      end

      @scheduler.in('0s') do
        fail 'miserably'
      end

      sleep 0.5

      expect($message).to eq('Rufus::Scheduler::InJob 0s miserably')
    end
  end
end

