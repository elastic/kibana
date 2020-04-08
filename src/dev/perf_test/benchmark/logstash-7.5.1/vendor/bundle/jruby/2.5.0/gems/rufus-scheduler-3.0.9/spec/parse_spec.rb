
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

require 'spec_helper'


describe Rufus::Scheduler do

  describe '.parse' do

    def parse(s, opts={})
      Rufus::Scheduler.parse(s, opts)
    end

    it 'parses duration strings' do

      expect(parse('1.0d1.0w1.0d')).to eq(777600.0)
    end

    it 'parses datetimes' do

      # local

      expect(parse('Sun Nov 18 16:01:00 2012').strftime('%c')).to eq(
        'Sun Nov 18 16:01:00 2012'
      )
    end

    it 'parses datetimes with timezones' do

      expect(parse('Sun Nov 18 16:01:00 2012 Japan').getutc.strftime('%c')).to eq(
        'Sun Nov 18 07:01:00 2012'
      )

      expect(parse('Sun Nov 18 16:01:00 2012 Zulu').getutc.strftime('%c')).to eq(
        'Sun Nov 18 16:01:00 2012'
      )

      expect(parse('Sun Nov 18 16:01:00 Japan 2012').getutc.strftime('%c')).to eq(
        'Sun Nov 18 07:01:00 2012'
      )

      expect(parse('Japan Sun Nov 18 16:01:00 2012').getutc.strftime('%c')).to eq(
        'Sun Nov 18 07:01:00 2012'
      )

      expect(parse('Sun Nov 18 16:01:00 2012 America/New_York').getutc.strftime('%c')).to eq(
        'Sun Nov 18 21:01:00 2012'
      )
    end

    it 'parses datetimes with named timezones' do

      expect(parse(
        'Sun Nov 18 16:01:00 2012 Europe/Berlin'
      ).strftime('%c %z')).to eq(
        'Sun Nov 18 15:01:00 2012 +0000'
      )
    end

    it 'parses datetimes (with the local timezone implicitely)' do

      localzone = Time.now.strftime('%z')

      expect(parse('Sun Nov 18 16:01:00 2012').strftime('%c %z')).to eq(
        "Sun Nov 18 16:01:00 2012 #{localzone}"
      )
    end

    it 'parses cronlines' do

      out = parse('* * * * *')

      expect(out.class).to eq(Rufus::Scheduler::CronLine)
      expect(out.original).to eq('* * * * *')

      expect(parse('10 23 * * *').class).to eq(Rufus::Scheduler::CronLine)
      expect(parse('* 23 * * *').class).to eq(Rufus::Scheduler::CronLine)
    end

    it 'raises on unparseable input' do

      expect {
        parse('nada')
      }.to raise_error(ArgumentError, 'couldn\'t parse "nada"')
    end

    it 'does not use Chronic if not present' do

      t = parse('next monday 7 PM')

      n = Time.now

      expect(t.strftime('%Y-%m-%d %H:%M:%S')).to eq(
        n.strftime('%Y-%m-%d') + ' 19:00:00'
      )
    end

    it 'uses Chronic if present' do

      with_chronic do

        t = parse('next monday 7 PM')

        expect(t.wday).to eq(1)
        expect(t.hour).to eq(19)
        expect(t.min).to eq(0)
        expect(t).to be > Time.now
      end
    end

    it 'passes options to Chronic' do

      with_chronic do

        t = parse('monday', :context => :past)

        expect(t.wday).to eq(1)
        expect(t).to be < Time.now
      end
    end
  end

  describe '.parse_duration' do

    def pd(s)
      Rufus::Scheduler.parse_duration(s)
    end

    it 'parses duration strings' do

      expect(pd('-1.0d1.0w1.0d')).to eq(-777600.0)
      expect(pd('-1d1w1d')).to eq(-777600.0)
      expect(pd('-1w2d')).to eq(-777600.0)
      expect(pd('-1h10s')).to eq(-3610.0)
      expect(pd('-1h')).to eq(-3600.0)
      expect(pd('-5.')).to eq(-5.0)
      expect(pd('-2.5s')).to eq(-2.5)
      expect(pd('-1s')).to eq(-1.0)
      expect(pd('-500')).to eq(-500)
      expect(pd('')).to eq(0.0)
      expect(pd('5.0')).to eq(5.0)
      expect(pd('0.5')).to eq(0.5)
      expect(pd('.5')).to eq(0.5)
      expect(pd('5.')).to eq(5.0)
      expect(pd('500')).to eq(500)
      expect(pd('1000')).to eq(1000)
      expect(pd('1')).to eq(1.0)
      expect(pd('1s')).to eq(1.0)
      expect(pd('2.5s')).to eq(2.5)
      expect(pd('1h')).to eq(3600.0)
      expect(pd('1h10s')).to eq(3610.0)
      expect(pd('1w2d')).to eq(777600.0)
      expect(pd('1d1w1d')).to eq(777600.0)
      expect(pd('1.0d1.0w1.0d')).to eq(777600.0)

      expect(pd('.5m')).to eq(30.0)
      expect(pd('5.m')).to eq(300.0)
      expect(pd('1m.5s')).to eq(60.5)
      expect(pd('-.5m')).to eq(-30.0)

      expect(pd('1')).to eq(1)
      expect(pd('0.1')).to eq(0.1)
      expect(pd('1s')).to eq(1)
    end

    it 'calls #to_s on its input' do

      expect(pd(0.1)).to eq(0.1)
    end

    it 'raises on wrong duration strings' do

      expect { pd('-') }.to raise_error(ArgumentError)
      expect { pd('h') }.to raise_error(ArgumentError)
      expect { pd('whatever') }.to raise_error(ArgumentError)
      expect { pd('hms') }.to raise_error(ArgumentError)

      expect { pd(' 1h ') }.to raise_error(ArgumentError)
    end
  end

  describe '.parse_time_string -> .parse_duration' do

    it 'is still around for libs using it out there' do

      expect(Rufus::Scheduler.parse_time_string('1d1w1d')).to eq(777600.0)
    end
  end

  describe '.parse_duration_string -> .parse_duration' do

    it 'is still around for libs using it out there' do

      expect(Rufus::Scheduler.parse_duration_string('1d1w1d')).to eq(777600.0)
    end
  end

  describe '.to_duration' do

    def td(o, opts={})
      Rufus::Scheduler.to_duration(o, opts)
    end

    it 'turns integers into duration strings' do

      expect(td(0)).to eq('0s')
      expect(td(60)).to eq('1m')
      expect(td(61)).to eq('1m1s')
      expect(td(3661)).to eq('1h1m1s')
      expect(td(24 * 3600)).to eq('1d')
      expect(td(7 * 24 * 3600 + 1)).to eq('1w1s')
      expect(td(30 * 24 * 3600 + 1)).to eq('4w2d1s')
    end

    it 'ignores seconds and milliseconds if :drop_seconds => true' do

      expect(td(0, :drop_seconds => true)).to eq('0m')
      expect(td(5, :drop_seconds => true)).to eq('0m')
      expect(td(61, :drop_seconds => true)).to eq('1m')
    end

    it 'displays months if :months => true' do

      expect(td(1, :months => true)).to eq('1s')
      expect(td(30 * 24 * 3600 + 1, :months => true)).to eq('1M1s')
    end

    it 'turns floats into duration strings' do

      expect(td(0.1)).to eq('100')
      expect(td(1.1)).to eq('1s100')
    end
  end

  describe '.to_duration_hash' do

    def tdh(o, opts={})
      Rufus::Scheduler.to_duration_hash(o, opts)
    end

    it 'turns integers duration hashes' do

      expect(tdh(0)).to eq({})
      expect(tdh(60)).to eq({ :m => 1 })
    end

    it 'turns floats duration hashes' do

      expect(tdh(0.128)).to eq({ :ms => 128 })
      expect(tdh(60.127)).to eq({ :m => 1, :ms => 127 })
    end

    it 'drops seconds and milliseconds if :drop_seconds => true' do

      expect(tdh(61.127)).to eq({ :m => 1, :s => 1, :ms => 127 })
      expect(tdh(61.127, :drop_seconds => true)).to eq({ :m => 1 })
    end
  end
end

