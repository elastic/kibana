# encoding: utf-8
require "json"

module LogStash module Filters module Dictionary
  class JsonFile < File

    protected

    def initialize_for_file_type
    end

    def read_file_into_dictionary
      content = IO.read(@dictionary_path, :mode => 'r:bom|utf-8')
      @dictionary.update(LogStash::Json.load(content)) unless content.nil? || content.empty?
    end
  end
end end end

__END__
Preserving the text below for near term prosperity...

I tried hard to find a stream parsing solution with JrJackson and sc_load
but it was no faster than the above code.
The idea is for each line to be read into the streaming parse that will update
the @dictionary as each key/value is found.
It will be lower on memory consumption because the JSON string is not read into memory
and then a Ruby Hash created and merged into @dictionary.
I decided to trade speed for memory. Side Note, it seems that
the json gem has become quite speedy lately.

e.g.
require_relative 'json_handler'
...
    def initialize_for_file_type
      @handler = JsonHandler.new(@dictionary)
    end

    def read_file_into_dictionary
      ::File.open(@dictionary_path, "r:bom|utf-8") do |io|
        JrJackson::Json.sc_load(@handler, io, {raw: true})
      end
    end
...
where JsonHandler is:

require 'jrjackson'

module LogStash module Filters module Dictionary
  class JsonHandler
    def initialize(dictionary)
      @dictionary = dictionary
      @map_depth = 0
    end

    def hash_start()
      @map_depth = @map_depth.succ
      @map_depth == 1 ? @dictionary : {}
    end

    def hash_end()
      @map_depth = @map_depth.pred
    end

    def hash_key(key)
      key
    end

    def array_start()
      []
    end

    def array_end()
    end

    def add_value(value)
      # @result = value
    end

    def hash_set(h, key, value)
      h[key] = value
    end

    def array_append(a, value)
      a.push(value)
    end
  end
end end end
