# This patch was stolen from logstash-plugins/logstash-output-sqs#20.
#
# This patch is a workaround for a JRuby issue which has been fixed in JRuby
# 9000, but not in JRuby 1.7. See https://github.com/jruby/jruby/issues/3645
# and https://github.com/jruby/jruby/issues/3920. This is necessary because the
# `aws-sdk` is doing tricky name discovery to generate the correct error class.
#
# As per https://github.com/aws/aws-sdk-ruby/issues/1301#issuecomment-261115960,
# this patch may be short-lived anyway.
require 'aws-sdk'

begin
  old_stderr = $stderr
  $stderr = StringIO.new

  module Aws
    const_set(:SQS, Aws::SQS)
  end
ensure
  $stderr = old_stderr
end
