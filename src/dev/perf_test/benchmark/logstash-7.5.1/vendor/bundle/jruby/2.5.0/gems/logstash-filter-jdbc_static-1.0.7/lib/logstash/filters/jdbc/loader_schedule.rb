# encoding: utf-8
require_relative "validatable"
require "rufus/scheduler"

module LogStash module Filters module Jdbc
  class LoaderSchedule < Validatable
    attr_reader :schedule_frequency, :loader_schedule

    def to_log_string
      message = ""
      message.concat "these months in the year [#{@cronline.months.to_a.join(", ")}];" unless @cronline.months.nil?
      message.concat "these days in the month [#{@cronline.days.to_a.join(", ")}];" unless @cronline.days.nil?
      message.concat "these hours in the day [#{@cronline.hours.to_a.join(", ")}];" unless @cronline.hours.nil?
      message.concat "these minutes in the hour [#{@cronline.minutes.to_a.join(", ")}];" unless @cronline.minutes.nil?
      message.concat "these seconds in the minute [#{@cronline.seconds.to_a.join(", ")}]" unless @cronline.seconds.nil?
      if !message.empty?
        message.prepend "Scheduled for: "
      end
      message
    end

    private

    def post_initialize
      if valid?
        # From the Rufus::Scheduler docs:
        #   By default, rufus-scheduler sleeps 0.300 second between every step.
        #   At each step it checks for jobs to trigger and so on.
        # set the frequency to 2.5 seconds if we are not reloading in the seconds timeframe
        # rufus scheduler thread should respond to stop quickly enough.
        if only_seconds_set?
          @schedule_frequency = 0.3
        else
          @schedule_frequency = 2.5
        end
      end
    end


    def only_seconds_set?
      @cronline.seconds &&
        @cronline.minutes.nil? &&
        @cronline.hours.nil? &&
        @cronline.days.nil? &&
        @cronline.months.nil?
    end

    def parse_options
      @loader_schedule = @options

      unless @loader_schedule.is_a?(String)
        @option_errors << "The loader_schedule option must be a string"
      end

      begin
        @cronline = Rufus::Scheduler::CronLine.new(@loader_schedule)
      rescue => e
        @option_errors << "The loader_schedule option is invalid: #{e.message}"
      end

      @valid = @option_errors.empty?
    end
  end
end end end
