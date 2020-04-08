require 'java'
require 'jms/version'
require 'jms/connection'
require 'semantic_logger'

module JMS
  # Add Logging capabilities
  include SemanticLogger::Loggable

  autoload :SessionPool, 'jms/session_pool'
end
