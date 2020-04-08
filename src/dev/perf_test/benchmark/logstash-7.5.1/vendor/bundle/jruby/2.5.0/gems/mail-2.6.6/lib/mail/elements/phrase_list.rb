# encoding: utf-8
# frozen_string_literal: true
module Mail
  class PhraseList
    
    include Mail::Utilities
    
    def initialize(string)
      @phrase_lists = Mail::Parsers::PhraseListsParser.new.parse(string)
    end
    
    def phrases
      @phrase_lists.phrases.map { |p| unquote(p) }
    end

  end
end
