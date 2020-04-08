# frozen-string-literal: true

require 'memory_profiler'
require 'did_you_mean'

# public def foo; end
# error      = (self.fooo rescue $!)
# executable = -> { error.to_s }

METHODS    = ''.methods
INPUT      = 'start_with?'
collection = DidYouMean::SpellChecker.new(dictionary: METHODS)
executable = proc { collection.correct(INPUT) }

GC.disable
MemoryProfiler.report { 100.times(&executable) }.pretty_print
