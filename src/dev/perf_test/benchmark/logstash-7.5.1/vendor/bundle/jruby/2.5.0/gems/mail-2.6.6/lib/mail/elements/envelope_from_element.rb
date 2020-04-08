# encoding: utf-8
# frozen_string_literal: true
module Mail
  class EnvelopeFromElement
    
    include Mail::Utilities
    
    def initialize( string )
      @envelope_from = Mail::Parsers::EnvelopeFromParser.new.parse(string)
      @address = @envelope_from.address
      @date_time = ::DateTime.parse(@envelope_from.ctime_date)
    end
    
    def date_time
      @date_time
    end
    
    def address
      @address
    end
    
    # RFC 4155:
    #   a timestamp indicating the UTC date and time when the message
    #   was originally received, conformant with the syntax of the
    #   traditional UNIX 'ctime' output sans timezone (note that the
    #   use of UTC precludes the need for a timezone indicator);
    def formatted_date_time
      if @date_time.respond_to?(:ctime)
        @date_time.ctime
      else
        @date_time.strftime '%a %b %e %T %Y'
      end
    end

    def to_s
      "#{@address} #{formatted_date_time}"
    end
    
  end
end
