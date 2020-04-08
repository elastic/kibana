# This is patch related to the autoloading and ruby
#
# The fix exist in jruby 9k but not in the current jruby, not sure when or it will be backported
# https://github.com/jruby/jruby/issues/3645
#
# AWS is doing tricky name discovery in the module to generate the correct error class and
# this strategy is bogus in jruby and `eager_autoload` don't fix this issue.
#
# This will be a short lived patch since AWS is removing the need.
# see: https://github.com/aws/aws-sdk-ruby/issues/1301#issuecomment-261115960
old_stderr = $stderr

$stderr = StringIO.new
begin
  module Aws
    const_set(:S3, Aws::S3)
  end
ensure
  $stderr = old_stderr
end


