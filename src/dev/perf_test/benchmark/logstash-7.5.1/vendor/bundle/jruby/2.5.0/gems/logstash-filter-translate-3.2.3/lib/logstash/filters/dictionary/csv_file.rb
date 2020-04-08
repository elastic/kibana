# encoding: utf-8
require "csv"

module LogStash module Filters module Dictionary
  class CsvFile < File

    protected

    def initialize_for_file_type
      @io = StringIO.new("")
      @csv = ::CSV.new(@io)
    end

    def read_file_into_dictionary
      # low level CSV read that tries to create as
      # few intermediate objects as possible
      # this overwrites the value at key
      IO.foreach(@dictionary_path, :mode => 'r:bom|utf-8') do |line|
        @io.string = line
        k,v = @csv.shift
        @dictionary[k] = v
      end
    end
  end
end end end
