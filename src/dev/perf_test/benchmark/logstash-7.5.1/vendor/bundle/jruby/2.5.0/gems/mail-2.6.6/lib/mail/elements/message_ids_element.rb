# encoding: utf-8
# frozen_string_literal: true
module Mail
  class MessageIdsElement

    include Mail::Utilities

    def initialize(string)
      raise Mail::Field::ParseError.new(Mail::MessageIdsElement, string, 'nil is invalid') if string.nil?
      @message_ids = Mail::Parsers::MessageIdsParser.new.parse(string).message_ids.map { |msg_id| clean_msg_id(msg_id) }
    end

    def message_ids
      @message_ids
    end

    def message_id
      @message_ids.first
    end

    def clean_msg_id( val )
      val =~ /.*<(.*)>.*/ ; $1
    end

  end
end
