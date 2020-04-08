# encoding: utf-8
# frozen_string_literal: true
module Mail
  class ContentLocationElement # :nodoc:

    include Mail::Utilities

    def initialize( string )
      content_location = Mail::Parsers::ContentLocationParser.new.parse(string)
      @location = content_location.location
    end

    def location
      @location
    end

    def to_s(*args)
      location.to_s
    end

  end
end
