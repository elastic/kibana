# encoding: utf-8
require_relative "environment"
LogStash::Bundler.setup!({:without => [:build]})
require "logstash-core"
require "logstash/environment"

$LOAD_PATH.unshift(File.join(LogStash::Environment::LOGSTASH_CORE, "spec"))

require "rspec/core"
require "rspec"
require 'ci/reporter/rake/rspec_loader'

RSpec.world.reset # if multiple rspec runs occur in a single process, the RSpec "world" state needs to be reset.

status = RSpec::Core::Runner.run(ARGV.empty? ? ($JUNIT_ARGV || ["spec"]) : ARGV).to_i
if ENV["IS_JUNIT_RUN"]
  return status
end
exit status if status != 0
