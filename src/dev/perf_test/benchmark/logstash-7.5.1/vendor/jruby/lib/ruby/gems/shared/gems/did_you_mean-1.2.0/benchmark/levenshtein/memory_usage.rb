require 'memory_profiler'
require 'did_you_mean/levenshtein'

str1, str2 = "user_signed_in?", "user_logged_in?"

report = MemoryProfiler.report do
  80.times do
    DidYouMean::Levenshtein.distance str1, str2
  end
end

report.pretty_print
