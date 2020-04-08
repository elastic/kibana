# encoding: utf-8
# frozen_string_literal: true
module Mail
  class MimeVersionElement
    
    include Mail::Utilities
    
    def initialize( string )
      mime_version = Mail::Parsers::MimeVersionParser.new.parse(string)
      @major = mime_version.major
      @minor = mime_version.minor
    end
    
    def major
      @major
    end
    
    def minor
      @minor
    end
    
  end
end
