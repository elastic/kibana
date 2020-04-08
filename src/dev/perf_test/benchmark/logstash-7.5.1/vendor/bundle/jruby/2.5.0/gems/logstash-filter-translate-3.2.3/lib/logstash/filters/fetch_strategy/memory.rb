# encoding: utf-8

module LogStash module Filters module FetchStrategy module Memory
  class Exact
    def initialize(dictionary)
      @dictionary = dictionary
    end

    def fetch(source, results)
      if @dictionary.include?(source)
        results[1] = LogStash::Util.deep_clone(@dictionary[source])
      else
        results[0] = false
      end
    end
  end

  class ExactRegex
    def initialize(dictionary)
      @keys_regex = Hash.new()
      @dictionary = dictionary
      @dictionary.keys.each{|k| @keys_regex[k] = Regexp.new(k)}
    end

    def fetch(source, results)
      key = @dictionary.keys.detect{|k| source.match(@keys_regex[k])}
      if key.nil?
        results[0] = false
      else
        results[1] = LogStash::Util.deep_clone(@dictionary[key])
      end
    end
  end

  class RegexUnion
    def initialize(dictionary)
      @dictionary = dictionary
      @union_regex_keys = Regexp.union(@dictionary.keys)
    end

    def fetch(source, results)
      value = source.gsub(@union_regex_keys, @dictionary)
      if source == value
        results[0] = false
      else
        results[1] = LogStash::Util.deep_clone(value)
      end
    end
  end
end end end end


