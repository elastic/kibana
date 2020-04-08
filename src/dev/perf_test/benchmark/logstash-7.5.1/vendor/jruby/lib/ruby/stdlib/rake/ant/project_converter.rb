require 'rexml/parsers/sax2parser'
require 'rexml/sax2listener'
require 'rake/ant'

class Rake::Ant
  class ProjectConverter
    include REXML::SAX2Listener

    def initialize
      @output = $stdout
      @depth = 0
      @seen = ['<DOC>', 0]
    end

    def start_element(uri, localname, qname, attributes)
      emit_do(localname)
      case localname
      when "project"
        @output.puts "require 'ant'"
        emit "ant", attributes
      when "description"
        print_with_indent "project.description = "
      else
        emit localname, attributes
      end
      @depth += 1
    end

    def end_element(uri, localname, qname)
      @depth -= 1
      emit_end(localname)
    end

    def characters(text)
      @output.print value_inspect(text.strip) if text.strip.length > 0
    end

    def emit_do(tag)
      @output.puts " do" if @seen.last[1] != @depth
      @seen << [tag, @depth]
    end

    def emit_end(tag)
      level = @seen.last
      if level[0] == tag && level[1] == @depth
        @output.puts
      else
        print_with_indent "end\n"
        @seen << ["/#{tag}", @depth]
      end
    end

    def emit(code, attributes = nil)
      print_with_indent safe_method_name(code, attributes)
      if attributes
        first = true
        attributes.each do |k,v|
          @output.print "," unless first
          @output.print " #{symbol_or_string(k)} => #{value_inspect(v)}"
          first = false
        end
      end
    end

    def print_with_indent(str)
      @output.print "  " * @depth
      @output.print str
    end

    ID = /\A[a-zA-Z_][a-zA-Z0-9_]*\z/

    def symbol_or_string(s)
      if s =~ ID
        ":#{s}"
      else
        s.inspect
      end
    end

    def value_inspect(s)
      s.inspect.gsub("\\n", "\n")
    end

    def safe_method_name(s, attributes)
      s = Ant.safe_method_name(s)
      if s =~ ID
        s
      else
        "_element #{s.inspect}#{attributes.nil? || attributes.empty? ? '' : ','}"
      end
    end

    def self.convert(file = "build.xml")
      source = File.exists?(file) ? File.new(file) : $stdin
      parser = REXML::Parsers::SAX2Parser.new source
      parser.listen self.new
      parser.parse
    end
  end
end
