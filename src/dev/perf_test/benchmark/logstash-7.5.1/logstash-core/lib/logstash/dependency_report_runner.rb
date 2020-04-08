require_relative "../../../lib/bootstrap/environment"

if $0 == __FILE__
  begin
    LogStash::Bundler.setup!({:without => [:build, :development]})
  rescue => Bundler::GemfileNotFound
    $stderr.puts("No Gemfile found. Maybe you need to run `rake artifact:tar`?")
    raise
  end

  require_relative "../../../lib/bootstrap/patches/jar_dependencies"
  require "logstash/dependency_report"

  exit_status = LogStash::DependencyReport.run
  exit(exit_status || 0)
end
