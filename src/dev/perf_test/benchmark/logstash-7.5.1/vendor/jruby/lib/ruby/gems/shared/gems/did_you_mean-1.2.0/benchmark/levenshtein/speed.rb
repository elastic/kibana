require 'benchmark/ips'
require 'did_you_mean'
require 'did_you_mean/levenshtein'

STR1, STR2 = "user_signed_in?", "user_logged_in?"

Benchmark.ips do |x|
  x.report "enumerable" do
    DidYouMean::Levenshtein.before_distance STR1, STR2
  end

  x.report "while" do
    DidYouMean::Levenshtein.after_distance STR1, STR2
  end

  x.compare!
end
