# encoding: utf-8

require 'psych/visitors/to_ruby'
require 'psych/exception'

unless defined?(Regexp::NOENCODING)
  Regexp::NOENCODING = 32
end

module LogStash module Filters module Dictionary
  class YamlVisitor < Psych::Visitors::ToRuby

    TAG_MAP_TABLE = Hash.new(false)
    TAG_MAP_TABLE[nil] = true
    TAG_MAP_TABLE["tag:yaml.org,2002:map"] = true
    TAG_MAP_TABLE["tag:yaml.org,2002:omap"] = true

    def accept_with_dictionary(dictionary, target)
      @dictionary = dictionary
      @map_depth = 0
      accept(target)
    end

    def visit_Psych_Nodes_Mapping(o)
      if Psych.load_tags[o.tag]
        return revive(resolve_class(Psych.load_tags[o.tag]), o)
      end

      target_hash = @map_depth == 0 ? @dictionary : {}
      @map_depth = @map_depth.succ

      if TAG_MAP_TABLE[o.tag]
        result = revive_hash(register(o, target_hash), o)
      else
        result = super(o)
      end

      @map_depth = @map_depth.pred
      result
    end
  end
end end end
