# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "belzebuth"
require "yaml"
require "elasticsearch"
require "fileutils"
require "stud/try"
require "open3"

VERSIONS_YML_PATH = File.join(File.dirname(__FILE__), "..", "..", "..", "..", "versions.yml")
VERSION_PATH = File.join(File.dirname(__FILE__), "..", "..", "..", "VERSION")
VERSION = File.exists?(VERSIONS_YML_PATH) ? YAML.load_file(VERSIONS_YML_PATH)['logstash'] : File.read(VERSION_PATH).strip

def get_logstash_path
  ENV["LOGSTASH_PATH"] || File.join(File.dirname(__FILE__), "../../../../")
end

def get_elasticsearch_path
  ENV["ELASTICSEARCH_PATH"] || File.join(File.dirname(__FILE__), "../../../../build/elasticsearch")
end

def elastic_password
  'elasticpass'
end

#
# Elasticsearch
#
def elasticsearch(options = {})
  temporary_path_data = Stud::Temporary.directory
  default_settings = {
    "path.data" => temporary_path_data,
    "xpack.monitoring.enabled" => true,
    "xpack.monitoring.collection.enabled" => true,
    "xpack.security.enabled" => true
  }
  settings = default_settings.merge(options.fetch(:settings, {}))
  settings_arguments = settings.collect { |k, v| "-E#{k}=#{v}" }

  unless bootstrap_password_exists?
    bootstrap_elastic_password
  end

  # Launch in the background and wait for /started/ stdout
  cmd = "bin/elasticsearch #{settings_arguments.join(' ')}"
  puts "Running elasticsearch: #{cmd}"
  response = Belzebuth.run(cmd, { :directory => get_elasticsearch_path, :wait_condition => /license.*valid/, :timeout => 15 * 60 })
  unless response.successful?
    raise "Could not start Elasticsearch, response: #{response}"
  end

  start_es_xpack_trial

  response
end

def start_es_xpack_trial
  if elasticsearch_client.perform_request(:get, '_xpack/license').body['license']['type'] != 'trial'
    resp = elasticsearch_client.perform_request(:post, '_xpack/license/start_trial', "acknowledge" => true)
    if resp.body["trial_was_started"] != true
      raise "Trial not started: #{resp.body}"
    end
  end
end

def bootstrap_elastic_password
  # we can't use Belzebuth here since the library doesn't support STDIN injection
  cmd = "bin/elasticsearch-keystore add bootstrap.password -f -x"
  result = Dir.chdir(get_elasticsearch_path) do |dir|
    _, status = Open3.capture2(cmd, :stdin_data => elastic_password)
    status
  end
  unless result.success?
    raise "Something went wrong when installing xpack,\ncmd: #{cmd}\nresponse: #{response}"
  end
end

def bootstrap_password_exists?
  cmd = "bin/elasticsearch-keystore list"
  response = Belzebuth.run(cmd, { :directory => get_elasticsearch_path })
  response.successful? && response.stdout_lines.any? { |line| line =~ /^bootstrap.password$/ }
end


def elasticsearch_xpack_installed?
  cmd = "bin/elasticsearch-plugin list"
  response = Belzebuth.run(cmd, { :directory => get_elasticsearch_path })
  response.stdout_lines.any? { |line| line =~ /x-pack/ }
end

def elasticsearch_client(options = { :url => "http://elastic:#{elastic_password}@localhost:9200" })
  Elasticsearch::Client.new(options)
end

def push_elasticsearch_config(pipeline_id, config)
  elasticsearch_client.index :index => '.logstash', :type => "_doc", id: pipeline_id, :body => { :pipeline => config }
end

def cleanup_elasticsearch(index = MONITORING_INDEXES)
  elasticsearch_client.indices.delete :index => index
  elasticsearch_client.indices.refresh
end

def logstash_command_append(cmd, argument, value)
  if cmd !~ /#{Regexp.escape(argument)}/
    cmd << " #{argument} #{value}"
  else
    puts "Argument '#{argument}' already exist in the command: #{cmd}"
  end

  cmd
end

def logstash(cmd, options = {})
  temporary_settings = Stud::Temporary.directory
  temporary_data = Stud::Temporary.directory

  cmd = logstash_command_append(cmd, "--path.settings", temporary_settings)
  cmd = logstash_command_append(cmd, "--path.data", temporary_data)

  logstash_yaml = File.join(temporary_settings, "logstash.yml")
  default_settings = {"xpack.monitoring.enabled" => true}
  IO.write(logstash_yaml, YAML::dump(default_settings.merge(options.fetch(:settings, {}))))
  FileUtils.cp(File.join(get_logstash_path, "config", "log4j2.properties"), File.join(temporary_settings, "log4j2.properties") )

  puts "Running logstash with #{cmd} in #{get_logstash_path} with settings #{options.inspect}"
  Belzebuth.run(cmd, {:directory => get_logstash_path }.merge(options.fetch(:belzebuth, { })))
end

def verify_response!(cmd, response)
  unless response.successful?
    raise "Something went wrong when installing xpack,\ncmd: #{cmd}\nresponse: #{response}"
  end
end
