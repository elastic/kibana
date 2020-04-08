# encoding: utf-8
require "logstash/environment"
require "jrjackson"

module LogStash
  module Json
    extend self

    def jruby_load(data, options = {})
      # TODO [guyboertje] remove these comments in 5.0
      # options[:symbolize_keys] ? JrJackson::Raw.parse_sym(data) : JrJackson::Raw.parse_raw(data)

      JrJackson::Ruby.parse(data, options)

    rescue JrJackson::ParseError => e
      raise LogStash::Json::ParserError.new(e.message)
    end

    def jruby_dump(o, options={})
      # TODO [guyboertje] remove these comments in 5.0
      # test for enumerable here to work around an omission in JrJackson::Json.dump to
      # also look for Java::JavaUtil::ArrayList, see TODO submit issue
      # o.is_a?(Enumerable) ? JrJackson::Raw.generate(o) : JrJackson::Json.dump(o)
      JrJackson::Base.generate(o, options)

    rescue => e
      raise LogStash::Json::GeneratorError.new(e.message)
    end

    alias_method :load, "jruby_load".to_sym
    alias_method :dump, "jruby_dump".to_sym

  end
end
