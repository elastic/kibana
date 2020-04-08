# frozen_string_literal: true
module Mail::Parsers
  class MimeVersionParser
    include Mail::Utilities

    def parse(s)
      if Mail::Utilities.blank?(s)
        return MimeVersionStruct.new("", nil)
      end

      mime_version = MimeVersionStruct.new

      actions, error = Ragel.parse(:mime_version, s)
      if error
        raise Mail::Field::ParseError.new(Mail::MimeVersionElement, s, error)
      end

      major_digits_s = minor_digits_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Major Digits
        when :major_digits_s then major_digits_s = p
        when :major_digits_e
          mime_version.major = s[major_digits_s..(p-1)]

        # Minor Digits
        when :minor_digits_s then minor_digits_s = p
        when :minor_digits_e
          mime_version.minor = s[minor_digits_s..(p-1)]

        when :comment_e, :comment_s then nil

        else
          raise Mail::Field::ParseError.new(Mail::MimeVersionElement, s, "Failed to process unknown action: #{action}")
        end
      end
      mime_version
    end
  end
end
