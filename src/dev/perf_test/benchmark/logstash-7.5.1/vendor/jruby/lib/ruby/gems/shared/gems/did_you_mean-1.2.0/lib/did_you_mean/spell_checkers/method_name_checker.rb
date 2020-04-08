require "did_you_mean/spell_checker"

module DidYouMean
  class MethodNameChecker
    attr_reader :method_name, :receiver

    NAMES_TO_EXCLUDE = { NilClass => nil.methods }
    NAMES_TO_EXCLUDE.default = []

    def initialize(exception)
      @method_name  = exception.name
      @receiver     = exception.receiver
      @private_call = exception.respond_to?(:private_call?) ? exception.private_call? : false
    end

    def corrections
      @corrections ||= SpellChecker.new(dictionary: method_names).correct(method_name) - NAMES_TO_EXCLUDE[@receiver.class]
    end

    def method_names
      method_names = receiver.methods + receiver.singleton_methods
      method_names += receiver.private_methods if @private_call
      method_names.uniq!
      method_names
    end
  end
end
