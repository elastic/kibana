# frozen_string_literal: true
module Mail::Parsers
  class DateTimeParser
    include Mail::Utilities

    def parse(s)
      raise Mail::Field::ParseError.new(Mail::DateTimeElement, s, "nil is an invalid DateTime") if s.nil?

      date_time = DateTimeStruct.new([])

      actions, error = Ragel.parse(:date_time, s)
      if error
        raise Mail::Field::ParseError.new(Mail::DateTimeElement, s, error)
      end

      date_s = time_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Date
        when :date_s then date_s = p
        when :date_e
          date_time.date_string = s[date_s..(p-1)]

        # Time
        when :time_s then time_s = p
        when :time_e
          date_time.time_string = s[time_s..(p-1)]

        else
          raise Mail::Field::ParseError.new(Mail::DateTimeElement, s, "Failed to process unknown action: #{action}")
        end
      end

      date_time
    end
  end
end
