require "did_you_mean/version"
require "did_you_mean/core_ext/name_error"

require "did_you_mean/spell_checker"
require 'did_you_mean/spell_checkers/name_error_checkers'
require 'did_you_mean/spell_checkers/method_name_checker'
require 'did_you_mean/spell_checkers/key_error_checker'
require 'did_you_mean/spell_checkers/null_checker'

require "did_you_mean/formatters/plain_formatter"

module DidYouMean
  class DeprecatedIgnoredCallers < Array
    %i(
      +
      <<
      []=
      insert
      unshift
      push
    ).each do |method_name|
      eval <<-RUBY, nil, __FILE__, __LINE__ + 1
        def #{method_name}(*)
          warn "IGNORED_CALLERS has been deprecated and has no effect."

          super
        end
      RUBY
    end
  end

  IGNORED_CALLERS = DeprecatedIgnoredCallers.new

  SPELL_CHECKERS = Hash.new(NullChecker)
  SPELL_CHECKERS.merge!({
    "NameError"     => NameErrorCheckers,
    "NoMethodError" => MethodNameChecker,
    "KeyError"      => KeyErrorChecker
  })

  NameError.prepend DidYouMean::Correctable
  KeyError.prepend DidYouMean::Correctable

  def self.formatter
    @@formatter
  end

  def self.formatter=(formatter)
    @@formatter = formatter
  end

  self.formatter = PlainFormatter.new
end
