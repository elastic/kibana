# encoding: utf-8

require_relative "yaml_visitor"

module LogStash module Filters module Dictionary
  class YamlFile < File

    protected

    def initialize_for_file_type
      @visitor = YamlVisitor.create
    end

    def read_file_into_dictionary
      # low level YAML read that tries to create as
      # few intermediate objects as possible
      # this overwrites the value at key
      @visitor.accept_with_dictionary(
        @dictionary, Psych.parse_stream(
          IO.read(@dictionary_path, :mode => 'r:bom|utf-8')
      ))
    end
  end
end end end
