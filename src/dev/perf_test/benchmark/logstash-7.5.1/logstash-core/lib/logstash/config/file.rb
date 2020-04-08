# encoding: utf-8
require "logstash/config/grammar"
require "logstash/config/config_ast"
require "logger"

class LogStash::Config::File
  include Enumerable
  include LogStash::Util::Loggable

  public
  def initialize(text)
    @text = text
    @config = parse(text)
  end # def initialize

  def parse(text)
    grammar = LogStashConfigParser.new
    result = grammar.parse(text)
    if result.nil?
      raise LogStash::ConfigurationError, grammar.failure_reason
    end
    return result
  end # def parse

  def plugin(plugin_type, name, *args)
    klass = LogStash::Plugin.lookup(plugin_type, name)
    return klass.new(*args)
  end

  def each
    @config.recursive_select(LogStash::Config::AST::Plugin)
  end
end #  class LogStash::Config::Parser

#agent.config(cfg)
