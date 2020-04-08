ENV['MT_NO_PLUGINS'] = '1' # Work around stupid autoloading of plugins
gem 'minitest'
require 'minitest/global_expectations/autorun'
require 'minitest/hooks/default'
require 'minitest/shared_description'

require_relative "deprecation_helper"

def Sequel.guarded?(*checked)
  unless ENV['SEQUEL_NO_PENDING']
    checked.each do |c|
      case c
      when DB.database_type
        return c
      when Array
        case c.length
        when 1
          return c if c.first == DB.adapter_scheme
        when 2
          if c.first.is_a?(Proc)
            return c if c.last == DB.database_type && c.first.call(DB)
          elsif c.last.is_a?(Proc)
            return c if c.first == DB.adapter_scheme && c.last.call(DB)
          else
            return c if c.first == DB.adapter_scheme && c.last == DB.database_type
          end
        when 3
          return c if c[0] == DB.adapter_scheme && c[1] == DB.database_type && c[2].call(DB)
        end          
      end
    end
  end
  false
end

module Minitest::Spec::DSL
  def cspecify(message, *checked, &block)
    if pending = Sequel.guarded?(*checked)
      it(message) do
        proc{instance_exec(&block)}.must_raise(Exception) if ENV['SEQUEL_CHECK_PENDING']
        skip "Not yet working on #{Array(pending).map{|x| x.is_a?(Proc) ? :proc : x}.join(', ')}"
      end
    else
      it(message, &block)
    end
  end
end

class Minitest::HooksSpec
  def log
    begin
      DB.loggers << Logger.new(STDOUT)
      yield
    ensure
     DB.loggers.pop
    end
  end
end

