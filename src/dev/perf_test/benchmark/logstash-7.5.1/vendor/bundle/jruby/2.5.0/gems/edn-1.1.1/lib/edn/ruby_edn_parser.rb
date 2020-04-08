require 'stringio'
require 'set'


module EDN
  class RubyEdnParser
    def initialize(source, *extra)
      io = source.instance_of?(String) ? StringIO.new(source) : source
      @s = CharStream.new(io)
    end

    def read(return_nothing=false)
      meta = read_meta
      value = read_basic(return_nothing)
      if meta && value != NOTHING
        value.extend EDN::Metadata
        value.metadata = meta
      end
      value
    end

    def eof?
      @s.eof?
    end

    def unknown
      raise "Don't know what to do with #{@s.current} #{@s.current.class}"
    end

    def read_eof
      EOF
    end

    def read_char
      result = @s.advance
      @s.advance
      until @s.eof?
        break unless @s.digit? || @s.alpha?
        result += @s.current
        @s.advance
      end

      return result if result.size == 1

      case result
      when 'newline'
        "\n"
      when 'return'
        "\r"
      when 'tab'
        "\t"
      when 'space'
        " "
      else
        raise "Unknown char #{result}"
      end
    end

    def read_slash
      @s.advance
      Type::Symbol.new('/')
    end

    def read_number_or_symbol
      leading = @s.current
      @s.advance
      return read_number(leading) if @s.digit?
      read_symbol(leading)
    end

    def read_symbol_chars
      result = ''

      ch = @s.current
      while SYMBOL_INTERIOR_CHARS.include?(ch)
        result << ch
        ch = @s.advance
      end
      return result unless @s.skip_past('/')

      result << '/'
      ch = @s.current
      while SYMBOL_INTERIOR_CHARS.include?(ch)
        result << ch
        ch = @s.advance
      end

      result
    end

    def read_extension
      @s.advance
      if @s.current == '{'
        @s.advance
        read_collection(Set, '}')
      elsif @s.current == "_"
        @s.advance
        x = read
        NOTHING
      else
        tag = read_symbol_chars
        value = read
        EDN.tagged_element(tag, value)
      end
    end

    def read_symbol(leading='')
      token = leading + read_symbol_chars
      return true if token == "true"
      return false if token == "false"
      return nil if token == "nil"
      Type::Symbol.new(token)
    end

    def read_keyword
      @s.advance
      read_symbol_chars.to_sym
    end

    def escape_char(ch)
      return '\\' if ch == '\\'
      return "\n" if ch == 'n'
      return "\t" if ch == 't'
      return "\r" if ch == 'r'
      ch
    end

    def read_string
      @s.advance

      result = ''
      until @s.current == '"'
        raise "Unexpected eof" if @s.eof?
        if @s.current == '\\'
          @s.advance
          result << escape_char(@s.current)
        else
          result << @s.current
        end
        @s.advance
      end
      @s.advance
      result
    end

    def call_reader(reader)
      if reader.instance_of? Symbol
        self.send(reader)
      else
        self.instance_exec(&reader)
      end
    end

    def read_basic(return_nothing=false)
      @s.skip_ws
      ch = @s.current
      result = call_reader(READERS[ch])
      while NOTHING.equal?(result) && !return_nothing
        @s.skip_ws
        result = call_reader(READERS[@s.current])
      end

      result
    end
  
    def read_digits(min_digits=0)
      result = ''

      if @s.current == '+' || @s.current == '-'
        result << @s.current
        @s.advance
      end
 
      n_digits = 0
      while @s.current =~ /[0-9]/
        n_digits += 1
        result << @s.current
        @s.advance
      end

      raise "Expected at least #{min_digits} digits, found #{result}" unless n_digits >= min_digits
      result
    end

    def finish_float(whole_part)
      result = whole_part

      if @s.current == '.'
        result += '.'
        @s.advance
        result = @s.digit? ? result + read_digits : result + '0'
        #puts "aaa: #{result}"
      end

      if @s.current == 'e' || @s.current == 'E'
        @s.advance
        result = result + 'e' + read_digits
        #puts "bbb: #{result}"
      end
      #puts result
      result.to_f 
    end

    def read_number(leading='')
      result = leading + read_digits

      if %w{. e E}.include? @s.current
        return finish_float(result)
      elsif @s.skip_past('M') || @s.skip_past('N')
        result.to_i
      else
        result.to_i
      end
    end

    def read_meta
      raw_metadata = []
      @s.skip_ws
      while @s.current == '^'
        @s.advance
        raw_metadata << read_basic
        @s.skip_ws
      end

      metadata = raw_metadata.reverse.reduce({}) do |acc, m|
        case m
        when Symbol then acc.merge(m => true)
        when EDN::Type::Symbol then acc.merge(:tag => m)
        else acc.merge(m)
        end
      end
      metadata.empty? ? nil : metadata
    end

    def read_list
      @s.advance
      read_collection(EDN::Type::List, ')')
    end

    def read_vector
      @s.advance
      read_collection(Array, ']')
    end

    def read_map
      @s.advance
      array = read_collection(Array, '}')
      raise "Need an even number of items for a map" unless array.count.even?
      Hash[*array]
    end

    def read_collection(clazz, closing)
      result = clazz.new

      while true
        @s.skip_ws
        raise "Unexpected eof" if @s.eof?
        break if @s.current == closing
        next_value = read(true)
        result << next_value unless next_value == NOTHING
      end
      @s.advance
      result
    end
  end
end
