# frozen_string_literal: true
module Mail::Parsers
  class ReceivedParser

    def parse(s)
      raise Mail::Field::ParseError.new(Mail::ReceivedElement, s, 'nil is invalid') if s.nil?
      actions, error = Ragel.parse(:received, s)
      if error
        raise Mail::Field::ParseError.new(Mail::ReceivedElement, s, error)
      end

      received = ReceivedStruct.new

      received_tokens_s = date_s = time_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Received Tokens:
        when :received_tokens_s then received_tokens_s = p
        when :received_tokens_e
          received.info = s[received_tokens_s..(p-1)]

        # Date
        when :date_s then date_s = p
        when :date_e
          received.date = s[date_s..(p-1)].strip

        # Time
        when :time_s then time_s = p
        when :time_e
          received.time = s[time_s..(p-1)]

        when :angle_addr_s, :comment_e, :comment_s,
             :domain_e, :domain_s, :local_dot_atom_e,
             :local_dot_atom_pre_comment_e,
             :local_dot_atom_pre_comment_s,
             :local_dot_atom_s, :qstr_e, :qstr_s,
             :local_quoted_string_s, :local_quoted_string_e
          # ignored actions

        else
          raise Mail::Field::ParseError.new(Mail::ReceivedElement, s, "Failed to process unknown action: #{action}")
        end
      end
      received
    end
  end
end
