# encoding: utf-8

require 'java'

# Java client logging depends on SLF4J
require 'ext/slf4j-api'
require 'ext/slf4j-simple'

require 'ext/rabbitmq-client'

require 'march_hare/version'
require 'march_hare/exceptions'
require 'march_hare/session'

# MarchHare is a JRuby client for RabbitMQ built on top of the official Java client.
#
# @see MarchHare.connect
# @see MarchHare::Session
# @see MarchHare::Channel
module MarchHare
  # Delegates to {MarchHare::Session.connect}
  # @see MarchHare::Session.connect
  def self.connect(*args)
    Session.connect(*args)
  end
end

# Backwards compatibility
# @private
Hotbunnies = MarchHare
# Backwards compatibility
# @private
HotBunnies = MarchHare

require 'march_hare/channel'
require 'march_hare/queue'
require 'march_hare/exchange'
