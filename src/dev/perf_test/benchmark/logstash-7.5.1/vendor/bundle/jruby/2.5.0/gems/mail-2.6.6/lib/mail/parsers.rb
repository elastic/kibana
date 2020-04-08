# frozen_string_literal: true
module Mail
  module Parsers

    # Low-level ragel based parsers
    require 'mail/parsers/ragel'

    AddressListStruct = Struct.new(:addresses, :group_names, :error)
    AddressStruct = Struct.new(:raw, :domain, :comments, :local,
                             :obs_domain_list, :display_name, :group, :error)
    ContentDispositionStruct = Struct.new(:disposition_type, :parameters, :error)
    ContentLocationStruct = Struct.new(:location, :error)
    ContentTransferEncodingStruct = Struct.new(:encoding, :error)
    ContentTypeStruct = Struct.new(:main_type, :sub_type, :parameters, :error)
    DateTimeStruct = Struct.new(:date_string, :time_string, :error)
    EnvelopeFromStruct = Struct.new(:address, :ctime_date, :error)
    MessageIdsStruct = Struct.new(:message_ids, :error)
    MimeVersionStruct = Struct.new(:major, :minor, :error)
    PhraseListsStruct = Struct.new(:phrases, :error)
    ReceivedStruct = Struct.new(:date, :time, :info, :error)

    require 'mail/parsers/ragel/parser_info'
    Ragel::FIELD_PARSERS.each do |field_parser|
      require "mail/parsers/#{field_parser}_parser"
    end
  end
end
