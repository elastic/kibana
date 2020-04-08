# encoding: utf-8

module LogStash module Inputs
  module FriendlyDurations
    NUMBERS_RE = /^(?<number>\d+(\.\d+)?)\s?(?<units>s((ec)?(ond)?)(s)?|m((in)?(ute)?)(s)?|h(our)?(s)?|d(ay)?(s)?|w(eek)?(s)?|us(ec)?(s)?|ms(ec)?(s)?)?$/
    HOURS = 3600
    DAYS = 24 * HOURS
    MEGA = 10**6
    KILO = 10**3

    ValidatedStruct = Struct.new(:value, :error_message) do
      def to_a
        error_message.nil? ? [true, value] : [false, error_message]
      end
    end

    def self.call(value, unit = "sec")
      # coerce into seconds
      val_string = value.to_s.strip
      matched = NUMBERS_RE.match(val_string)
      if matched.nil?
        failed_message = "Value '#{val_string}' is not a valid duration string e.g. 200 usec, 250ms, 60 sec, 18h, 21.5d, 1 day, 2w, 6 weeks"
        return ValidatedStruct.new(nil, failed_message)
      end
      multiplier = matched[:units] || unit
      numeric = matched[:number].to_f
      case multiplier
      when "m","min","mins","minute","minutes"
        ValidatedStruct.new(numeric * 60, nil)
      when "h","hour","hours"
        ValidatedStruct.new(numeric * HOURS, nil)
      when "d","day","days"
        ValidatedStruct.new(numeric * DAYS, nil)
      when "w","week","weeks"
        ValidatedStruct.new(numeric * 7 * DAYS, nil)
      when "ms","msec","msecs"
        ValidatedStruct.new(numeric / KILO, nil)
      when "us","usec","usecs"
        ValidatedStruct.new(numeric / MEGA, nil)
      else
        ValidatedStruct.new(numeric, nil)
      end
    end
  end
end end
