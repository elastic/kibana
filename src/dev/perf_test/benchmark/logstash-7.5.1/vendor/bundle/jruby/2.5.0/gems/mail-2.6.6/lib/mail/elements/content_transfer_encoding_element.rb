# encoding: utf-8
# frozen_string_literal: true
module Mail
  class ContentTransferEncodingElement
    
    include Mail::Utilities
    
    def initialize(string)
      content_transfer_encoding = Mail::Parsers::ContentTransferEncodingParser.new.parse(string)
      @encoding = content_transfer_encoding.encoding
    end
    
    def encoding
      @encoding
    end
    
  end
end
