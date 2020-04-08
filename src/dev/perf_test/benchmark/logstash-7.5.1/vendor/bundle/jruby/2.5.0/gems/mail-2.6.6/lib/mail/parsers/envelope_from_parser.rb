# frozen_string_literal: true
module Mail::Parsers
  class EnvelopeFromParser
    def parse(s)
      envelope_from = EnvelopeFromStruct.new
      if Mail::Utilities.blank?(s)
        return envelope_from
      end

      actions, error = Ragel.parse(:envelope_from, s)
      if error
        raise Mail::Field::ParseError.new(Mail::EnvelopeFromElement, s, error)
      end

      address_s = ctime_date_s = nil
      envelope_from = EnvelopeFromStruct.new
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Address
        when :address_s then address_s = p
        when :address_e
          envelope_from.address = s[address_s..(p-1)].rstrip

        # ctime_date
        when :ctime_date_s then ctime_date_s = p
        when :ctime_date_e
          envelope_from.ctime_date = s[ctime_date_s..(p-1)]

        # ignored actions
        when :angle_addr_s, :comment_e, :comment_s,
             :domain_e, :domain_s, :local_dot_atom_e,
             :local_dot_atom_pre_comment_e,
             :local_dot_atom_pre_comment_s,
             :local_dot_atom_s, :qstr_e, :qstr_s
          nil

        else
          raise Mail::Field::ParseError.new(Mail::EnvelopeFromElement, s, "Failed to process unknown action: #{action}")
        end
      end
      envelope_from
    end
  end
end
