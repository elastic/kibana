require 'memory_profiler'
require 'did_you_mean/jaro_winkler'

str1, str2 = "user_signed_in?", "user_logged_in?"

report = MemoryProfiler.report do
  80.times do
    DidYouMean::Jaro.distance str1, str2
  end
end

report.pretty_print
