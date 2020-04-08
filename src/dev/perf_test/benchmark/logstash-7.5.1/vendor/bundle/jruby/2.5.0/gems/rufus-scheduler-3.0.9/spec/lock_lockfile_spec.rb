
#
# Specifying rufus-scheduler
#
# Tue Aug 13 05:58:48 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  after :each do

    FileUtils.rm_f('.rufus-scheduler.lock')
    FileUtils.rm_f('lock.txt')
  end

  context ':lockfile => ".rufus-scheduler.lock"' do

    it 'writes down a .rufus-scheduler.lock file' do

      s = Rufus::Scheduler.new :lockfile => '.rufus-scheduler.lock'

      line = File.read('.rufus-scheduler.lock')

      #p line
      expect(line).to match(/pid: #{$$}/)
    end

    it '"flocks" the lock file' do

      s = Rufus::Scheduler.new :lockfile => '.rufus-scheduler.lock'

      f = File.new('.rufus-scheduler.lock', 'a')

      expect(f.flock(File::LOCK_NB | File::LOCK_EX)).to eq(false)
    end

    it 'prevents newer schedulers from starting' do

      s0 = Rufus::Scheduler.new :lockfile => '.rufus-scheduler.lock'
      s1 = Rufus::Scheduler.new :lockfile => '.rufus-scheduler.lock'

      expect(s0.started_at).not_to eq(nil)
      expect(s1.started_at).to eq(nil)
    end

    it 'releases the lockfile when shutting down' do

      s = Rufus::Scheduler.new :lockfile => '.rufus-scheduler.lock'

      s.shutdown(:kill)

      f = File.new('.rufus-scheduler.lock', 'a')

      expect(f.flock(File::LOCK_NB | File::LOCK_EX)).to eq(0)
    end
  end
end

