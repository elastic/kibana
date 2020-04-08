
#
# Specifying rufus-scheduler
#
# Wed Apr 17 06:00:59 JST 2013
#

puts "RUBY_VERSION: #{RUBY_VERSION}"
puts "RUBY_PLATFORM: #{RUBY_PLATFORM}"

Thread.abort_on_exception = true

require 'stringio'
require 'rufus-scheduler'

#
# misc helper methods

def ruby18?

  !! RUBY_VERSION.match(/^1\.8\./)
end

def jruby?

  !! RUBY_PLATFORM.match(/java/)
end

def local(*args)

  Time.local(*args)
end
alias lo local

def utc(*args)

  Time.utc(*args)
end

def ltz(tz, *args)

  in_zone(tz) { Time.local(*args) }
end

def ltu(tz, *args)

  in_zone(tz) { Time.local(*args) }.getutc
end

def sleep_until_next_minute

  min = Time.now.min
  while Time.now.min == min; sleep 2; end
end

def sleep_until_next_second

  sec = Time.now.sec
  while Time.now.sec == sec; sleep 0.2; end
end

def in_zone(zone_name, &block)

  prev_tz = ENV['TZ']
  ENV['TZ'] = zone_name

  block.call

ensure

  ENV['TZ'] = prev_tz
end

def with_chronic(&block)

  require 'chronic'

  Object.const_set(:Khronic, Chronic) unless defined?(Khronic)
  Object.const_set(:Chronic, Khronic) unless defined?(Chronic)

  block.call

ensure

  Object.send(:remove_const, :Chronic)
end

def without_chronic(&block) # for quick counter-tests ;-)

  block.call
end


#
# matchers

#require 'rspec/expectations'

RSpec::Matchers.define :be_within_1s_of do |expected|

  match do |actual|

    if actual.respond_to?(:asctime)
      (actual.to_f - expected.to_f).abs <= 1.0
    else
      false
    end
  end

  failure_message_for_should do |actual|

    if actual.respond_to?(:asctime)
      "expected #{actual.inspect} to be within 1 second of #{expected}"
    else
      "expected Time instance, got a #{actual.inspect}"
    end
  end
end


#
# configure

#RSpec.configure do |config|
#end

