# encoding: utf-8
require "logstash/plugins/registry"
require "logstash/inputs/rabbitmq"
require "logstash/outputs/rabbitmq"

LogStash::PLUGIN_REGISTRY.add(:input, "rabbitmq", LogStash::Inputs::RabbitMQ)
LogStash::PLUGIN_REGISTRY.add(:output, "rabbitmq", LogStash::Outputs::RabbitMQ)