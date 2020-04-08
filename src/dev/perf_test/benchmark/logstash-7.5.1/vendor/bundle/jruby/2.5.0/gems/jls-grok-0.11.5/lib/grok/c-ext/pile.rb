require "grok"

# A grok pile is an easy way to have multiple patterns together so
# that you can try to match against each one.
# The API provided should be similar to the normal Grok
# interface, but you can compile multiple patterns and match will
# try each one until a match is found.
class Grok
  class Pile
    def initialize
      @groks = []
      @patterns = {}
      @pattern_files = []
    end # def initialize

    # see Grok#add_pattern
    def add_pattern(name, string)
      @patterns[name] = string
    end # def add_pattern

    # see Grok#add_patterns_from_file
    def add_patterns_from_file(path)
      if !File.exists?(path)
        raise "File does not exist: #{path}"
      end
      @pattern_files << path
    end # def add_patterns_from_file

    # see Grok#compile
    def compile(pattern)
      grok = Grok.new
      @patterns.each do |name, value|
        grok.add_pattern(name, value)
      end
      @pattern_files.each do |path|
        grok.add_patterns_from_file(path)
      end
      grok.compile(pattern)
      @groks << grok
    end # def compile

    # Slight difference from Grok#match in that it returns
    # the Grok instance that matched successfully in addition
    # to the GrokMatch result.
    # See also: Grok#match
    def match(string)
      @groks.each do |grok|
        match = grok.match(string)
        if match
          return [grok, match]
        end
      end
      return false
    end # def match
  end # class Pile
end # class Grok
