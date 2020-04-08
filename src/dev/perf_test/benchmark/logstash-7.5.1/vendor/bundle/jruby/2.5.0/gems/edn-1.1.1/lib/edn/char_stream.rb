require 'stringio'
require 'set'

module EDN
  class CharStream
    def initialize(io=$stdin)
      @io = io
      @current = nil
    end

    def current
      return @current if @current
      advance
    end

    def advance
      return @current if @current == :eof
      @current = @io.getc || :eof
    end

    def digit?(c=current)
      /[0-9]/ =~ c
    end

    def alpha?(c=current)
      /[a-zA-Z]/ =~ c
    end

    def eof?(c=current)
      c == :eof
    end

    def ws?(c=current)
      /[ \t\r\n,]/ =~ c
    end

    def newline?(c=current)
      /[\n\r]/ =~ c
    end

    def repeat(pattern, &block)
      result = nil
      while current =~ pattern
        result ||= ''
        result = block.call(result, current)
      end
      result
    end

    def gather(pattern)
      repeat(pattern) do |result, ch|
        result << ch
      end
    end

    def skip_past(expected, error_message=nil)
      if current == expected
        advance
        return expected
      elsif error_message
        raise error_message
      end
      nil
    end

    def skip_to_eol
      until current == :eof || newline?
        advance
      end
    end

    def skip_ws
      while current != :eof
        if ws?(current)
          advance
        elsif current == ';'
          skip_to_eol
        else
          break
        end
      end
    end
  end
end
