require 'benchmark/ips'
require 'did_you_mean'

Benchmark.ips do |x|
  x.report "before" do
    DidYouMean::Jaro.before_distance "user_signed_in?", "user_logged_in?"
  end

  x.report "after" do
    DidYouMean::Jaro.after_distance "user_signed_in?", "user_logged_in?"
  end

  x.compare!
end
