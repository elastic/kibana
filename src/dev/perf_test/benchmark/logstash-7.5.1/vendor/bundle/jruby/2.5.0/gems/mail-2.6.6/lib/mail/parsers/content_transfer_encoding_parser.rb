# frozen_string_literal: true
module Mail::Parsers
  class ContentTransferEncodingParser

    def parse(s)
      content_transfer_encoding = ContentTransferEncodingStruct.new("")
      if Mail::Utilities.blank?(s)
        return content_transfer_encoding
      end

      actions, error = Ragel.parse(:content_transfer_encoding, s)
      if error
        raise Mail::Field::ParseError.new(Mail::ContentTransferEncodingElement, s, error)
      end

      encoding_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Encoding
        when :encoding_s then encoding_s = p
        when :encoding_e
          content_transfer_encoding.encoding = s[encoding_s..(p-1)].downcase

        else
          raise Mail::Field::ParseError.new(Mail::ContentTransferEncodingElement, s, "Failed to process unknown action: #{action}")
        end
      end

      content_transfer_encoding
    end
  end
end
