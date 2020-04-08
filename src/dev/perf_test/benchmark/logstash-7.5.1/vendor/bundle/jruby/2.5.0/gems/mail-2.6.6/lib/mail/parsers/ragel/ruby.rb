module Mail
  module Parsers
    module Ragel
      module Ruby
        def self.silence_warnings
          old, $VERBOSE = $VERBOSE, nil
          yield
        ensure
          $VERBOSE = old
        end

        # Ragel-generated parsers give a lot of warnings
        # and may cause logs to balloon in size
        silence_warnings do
          Mail::Parsers::Ragel::FIELD_PARSERS.each do |field_parser|
            require "mail/parsers/ragel/ruby/machines/#{field_parser}_machine"
          end
        end

        MACHINE_LIST = {
          :address_lists => AddressListsMachine,
          :phrase_lists => PhraseListsMachine,
          :date_time => DateTimeMachine,
          :received => ReceivedMachine,
          :message_ids => MessageIdsMachine,
          :envelope_from => EnvelopeFromMachine,
          :mime_version => MimeVersionMachine,
          :content_type => ContentTypeMachine,
          :content_disposition => ContentDispositionMachine,
          :content_transfer_encoding => ContentTransferEncodingMachine,
          :content_location => ContentLocationMachine
        }

        def self.parse(machine, string)
          MACHINE_LIST[machine].parse(string)
        end
      end
    end
  end
end
