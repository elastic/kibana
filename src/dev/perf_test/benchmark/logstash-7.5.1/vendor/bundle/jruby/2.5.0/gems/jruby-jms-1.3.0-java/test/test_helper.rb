# Allow test to be run in-place without requiring a gem install
$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'

# Configure Rails Environment
ENV['RAILS_ENV'] = 'test'

require 'minitest/autorun'
require 'minitest/reporters'
require 'yaml'
require 'jms'

Minitest::Reporters.use! Minitest::Reporters::SpecReporter.new

SemanticLogger.add_appender(file_name: 'test.log', formatter: :color)
SemanticLogger.default_level                       = :trace

# Set Log4J properties file so that it does not need to be in the CLASSPATH
java.lang.System.properties['log4j.configuration'] = 'test/log4j.properties'

# Load configuration from jms.yml
# Returns [Hash, String, String] the configuration, queue_name and topic_name
def read_config
  # To change the JMS provider, edit jms.yml and change :default

  # Load Connection parameters from configuration file
  cfg          = YAML.load_file(File.join(File.dirname(__FILE__), 'jms.yml'))
  jms_provider = cfg['default']
  config       = cfg[jms_provider]
  raise "JMS Provider option:#{jms_provider} not found in jms.yml file" unless config
  queue_name = config.delete(:queue_name) || raise("Mandatory :queue_name missing from jms.yml")
  topic_name = config.delete(:topic_name) || raise("Mandatory :topic_name missing from jms.yml")
  [config, queue_name, topic_name]
end
