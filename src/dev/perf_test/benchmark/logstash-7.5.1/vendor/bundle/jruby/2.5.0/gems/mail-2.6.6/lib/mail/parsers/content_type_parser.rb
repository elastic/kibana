# frozen_string_literal: true
module Mail::Parsers
  class ContentTypeParser
    include Mail::Utilities

    def parse(s)
      actions, error = Ragel.parse(:content_type, s)
      if error
        raise Mail::Field::ParseError.new(Mail::ContentTypeElement, s, error)
      end

      content_type = ContentTypeStruct.new(nil,nil,[])

      content_type.parameters = []

      main_type_s = sub_type_s = param_attr_s = param_attr = nil
      qstr_s = qstr = param_val_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Main Type
        when :main_type_s then main_type_s = p
        when :main_type_e then
          content_type.main_type = s[main_type_s..(p-1)]
          content_type.main_type.downcase!

        # Sub Type
        when :sub_type_s then sub_type_s = p
        when :sub_type_e
          content_type.sub_type = s[sub_type_s..(p-1)]
          content_type.sub_type.downcase!

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
            raise Mail::Field::ParseError.new(Mail::ContentTypeElement, s, "no attribute for value")
          end

          # Use quoted s value if one exists, otherwise use parameter value
          if qstr
            value = qstr
          else
            value = s[param_val_s..(p-1)]
          end

          content_type.parameters <<  { param_attr => value }
          param_attr = nil
          qstr = nil

        else
          raise Mail::Field::ParseError.new(Mail::ContentTypeElement, s, "Failed to process unknown action: #{action}")
        end
      end
      content_type
    end
  end
end
