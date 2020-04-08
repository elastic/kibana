# encoding: utf-8

module LogStash module Filters module FetchStrategy module File
  class Exact
    def initialize(dictionary, rw_lock)
      @dictionary = dictionary
      @read_lock = rw_lock.readLock
    end

    def dictionary_updated
    end

    def fetch(source, results)
      @read_lock.lock
      begin
        if @dictionary.include?(source)
          results[1] = LogStash::Util.deep_clone(@dictionary[source])
        else
          results[0] = false
        end
      ensure
        @read_lock.unlock
      end
    end
  end

  class ExactRegex
    def initialize(dictionary, rw_lock)
      @keys_regex = Hash.new()
      @dictionary = dictionary
      @read_lock = rw_lock.readLock
    end

    def dictionary_updated
      @keys_regex.clear
      # rebuilding the regex map is time expensive
      # 100 000 keys takes 0.5 seconds on a high spec Macbook Pro
      # at least we are not doing it for every event like before
      @dictionary.keys.each{|k| @keys_regex[k] = Regexp.new(k)}
    end

    def fetch(source, results)
      @read_lock.lock
      begin
        key = @dictionary.keys.detect{|k| source.match(@keys_regex[k])}
        if key.nil?
          results[0] = false
        else
          results[1] = LogStash::Util.deep_clone(@dictionary[key])
        end
      ensure
        @read_lock.unlock
      end
    end
  end

  class RegexUnion
    def initialize(dictionary, rw_lock)
      @dictionary = dictionary
      @read_lock = rw_lock.readLock
    end

    def dictionary_updated
      @union_regex_keys = Regexp.union(@dictionary.keys)
    end

    def fetch(source, results)
      @read_lock.lock
      begin
        value = source.gsub(@union_regex_keys, @dictionary)
        if source == value
          results[0] = false
        else
          results[1] = LogStash::Util.deep_clone(value)
        end
      ensure
        @read_lock.unlock
      end
    end
  end
end end end end
