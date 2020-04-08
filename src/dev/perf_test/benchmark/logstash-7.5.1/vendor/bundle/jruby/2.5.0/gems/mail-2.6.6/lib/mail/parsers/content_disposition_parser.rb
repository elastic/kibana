# frozen_string_literal: true
module Mail::Parsers
  class ContentDispositionParser
    include Mail::Utilities

    def parse(s)
      content_disposition = ContentDispositionStruct.new("", nil)
      if Mail::Utilities.blank?(s)
        return content_disposition
      end

      actions, error = Ragel.parse(:content_disposition, s)
      if error
        raise Mail::Field::ParseError.new(Mail::ContentDispositionElement, s, error)
      end

      content_disposition.parameters = []

      disp_type_s = param_attr_s = param_attr = qstr_s = qstr = param_val_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Disposition Type
        when :disp_type_s then disp_type_s = p
        when :disp_type_e
          content_disposition.disposition_type = s[disp_type_s..(p-1)].downcase

        # Parameter Attribute
        when :param_attr_s then param_attr_s = p
        when :param_attr_e then param_attr = s[param_attr_s..(p-1)]

        # Quoted String.
        when :qstr_s then qstr_s = p
        when :qstr_e then qstr = s[qstr_s..(p-1)]

        # Parameter Value
        when :param_val_s then param_val_s = p
        when :param_val_e
          if param_attr.nil?
            raise Mail::Field::ParseError.new(Mail::ContentDispositionElement, s, "no attribute for value")
          end

          # Use quoted string value if one exists, otherwise use parameter value
          if qstr
            value = qstr
          else
            value = s[param_val_s..(p-1)]
          end

          content_disposition.parameters <<  { param_attr => value }
          param_attr = nil
          qstr = nil

        else
          raise Mail::Field::ParseError.new(Mail::ContentDispositionElement, s, "Failed to process unknown action: #{action}")
        end
      end

      content_disposition
    end

    private
    def cleaned(string)
      string =~ /(.+);\s*$/ ? $1 : string
    end
  end
end
