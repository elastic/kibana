source 'https://rubygems.org'

gemspec

logstash_path = ENV["LOGSTASH_PATH"] || "../../logstash"
use_logstash_source = ENV["LOGSTASH_SOURCE"] && ENV["LOGSTASH_SOURCE"].to_s == "1"

if Dir.exist?(logstash_path) && use_logstash_source
  gem 'logstash-core', :path => "#{logstash_path}/logstash-core"
  gem 'logstash-core-plugin-api', :path => "#{logstash_path}/logstash-core-plugin-api"
end

if RUBY_VERSION == "1.9.3"
  gem 'rake', '12.2.1'
end