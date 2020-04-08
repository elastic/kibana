# frozen_string_literal: true
module Mail::Parsers
  class PhraseListsParser

    def parse(s)
      raise Mail::Field::ParseError.new(Mail::PhraseList, s, 'nil is invalid') if s.nil?

      actions, error = Ragel.parse(:phrase_lists, s)
      if error
        raise Mail::Field::ParseError.new(Mail::PhraseList, s, error)
      end

      phrase_lists = PhraseListsStruct.new([])

      phrase_s = nil
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Phrase
        when :phrase_s then phrase_s = p
        when :phrase_e
          phrase_lists.phrases << s[phrase_s..(p-1)] if phrase_s
          phrase_s = nil

        when :comment_e, :comment_s, :qstr_s, :qstr_e then nil

        else
          raise Mail::Field::ParseError.new(Mail::PhraseList, s, "Failed to process unknown action: #{action}")
        end
      end

      phrase_lists
    end
  end
end
