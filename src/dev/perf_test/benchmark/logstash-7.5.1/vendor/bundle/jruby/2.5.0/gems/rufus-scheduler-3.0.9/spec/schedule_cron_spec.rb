
#
# Specifying rufus-scheduler
#
# Sat Jul 13 04:52:08 JST 2013
#
# In the train between Bern and Fribourg, riding back
# from the @ruvetia drinkup
#

require 'spec_helper'


describe Rufus::Scheduler do

  before :each do
    @scheduler = Rufus::Scheduler.new
  end
  after :each do
    @scheduler.shutdown
  end

  describe '#cron' do

    it 'schedules' do

      counter = 0

      sleep_until_next_second
      sleep 0.3 # make sure to schedule right after a scheduler 'tick'

      job =
        @scheduler.cron '* * * * * *', :job => true do
          counter = counter + 1
        end

      sleep_until_next_second
      sleep_until_next_second
      sleep 0.3 # be sure to be well into the second

      expect(counter).to eq(2)
    end

    it 'raises if the job frequency is higher than the scheduler frequency' do

      @scheduler.frequency = 10

      expect {
        @scheduler.cron '* * * * * *' do; end
      }.to raise_error(ArgumentError)
    end
  end

  describe '#schedule_cron' do

    it 'returns a CronJob instance' do

      job = @scheduler.schedule_cron '* * * * *' do; end

      expect(job.class).to eq(Rufus::Scheduler::CronJob)
      expect(job.original).to eq('* * * * *')
      expect(job.job_id).to match(/^cron_/)
    end
  end
end

