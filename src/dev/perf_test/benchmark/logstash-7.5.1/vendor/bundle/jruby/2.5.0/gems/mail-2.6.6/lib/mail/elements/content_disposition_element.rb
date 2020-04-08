# encoding: utf-8
# frozen_string_literal: true
module Mail
  class ContentDispositionElement # :nodoc:
    
    include Mail::Utilities
    
    def initialize( string )
      content_disposition = Mail::Parsers::ContentDispositionParser.new.parse(cleaned(string))
      @disposition_type = content_disposition.disposition_type
      @parameters = content_disposition.parameters
    end
    
    def disposition_type
      @disposition_type
    end
    
    def parameters
      @parameters
    end
    
    def cleaned(string)
      string =~ /(.+);\s*$/ ? $1 : string
    end
    
  end
end
