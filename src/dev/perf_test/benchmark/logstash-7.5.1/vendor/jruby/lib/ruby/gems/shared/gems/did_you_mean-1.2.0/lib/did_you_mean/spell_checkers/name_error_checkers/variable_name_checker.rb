# frozen-string-literal: true

require "did_you_mean/spell_checker"

module DidYouMean
  class VariableNameChecker
    attr_reader :name, :method_names, :lvar_names, :ivar_names, :cvar_names

    NAMES_TO_EXCLUDE = { 'foo' => [:fork] }
    NAMES_TO_EXCLUDE.default = []
    RB_PREDEFINED_OBJECTS = [:false, :true, :nil]

    def initialize(exception)
      @name       = exception.name.to_s.tr("@", "")
      @lvar_names = exception.respond_to?(:local_variables) ? exception.local_variables : []
      receiver    = exception.receiver

      @method_names = receiver.methods + receiver.private_methods
      @ivar_names   = receiver.instance_variables
      @cvar_names   = receiver.class.class_variables
      @cvar_names  += receiver.class_variables if receiver.kind_of?(Module)
    end

    def corrections
      @corrections ||= SpellChecker
                     .new(dictionary: (RB_PREDEFINED_OBJECTS + lvar_names + method_names + ivar_names + cvar_names))
                     .correct(name) - NAMES_TO_EXCLUDE[@name]
    end
  end
end
