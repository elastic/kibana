# encoding: utf-8
# frozen_string_literal: true
module Mail
  class DateTimeElement # :nodoc:
    
    include Mail::Utilities
    
    def initialize( string )
      date_time = Mail::Parsers::DateTimeParser.new.parse(string)
      @date_string = date_time.date_string
      @time_string = date_time.time_string
    end
    
    def date_string
      @date_string
    end
    
    def time_string
      @time_string
    end
    
  end
end
