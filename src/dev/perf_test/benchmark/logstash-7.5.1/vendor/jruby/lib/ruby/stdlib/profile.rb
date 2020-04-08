# frozen_string_literal: true
require 'profiler'

# Commented out since JRuby doesn't have RubyVM namespace.
# JRuby will warn to pass --debug for equivalent functionality.
#RubyVM::InstructionSequence.compile_option = {
#  :trace_instruction => true,
#  :specialized_instruction => false
#}
END {
  Profiler__::print_profile(STDERR)
}
Profiler__::start_profile
