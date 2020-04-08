# encoding: utf-8
# frozen_string_literal: true
module Mail
  class ContentTypeElement # :nodoc:
    
    include Mail::Utilities
    
    def initialize( string )
      content_type = Mail::Parsers::ContentTypeParser.new.parse(cleaned(string))
      @main_type = content_type.main_type
      @sub_type = content_type.sub_type
      @parameters = content_type.parameters
    end
    
    def main_type
      @main_type
    end
    
    def sub_type
      @sub_type
    end
    
    def parameters
      @parameters
    end
    
    def cleaned(string)
      string =~ /(.+);\s*$/ ? $1 : string
    end
    
  end
end
