module DidYouMean
  module Correctable
    def original_message
      method(:to_s).super_method.call
    end

    def to_s
      msg = super.dup

      if !cause.respond_to?(:corrections) || cause.corrections.empty?
        msg << DidYouMean.formatter.message_for(corrections)
      end

      msg
    rescue
      super
    end

    def corrections
      spell_checker.corrections
    end

    def spell_checker
      @spell_checker ||= SPELL_CHECKERS[self.class.to_s].new(self)
    end
  end
end
