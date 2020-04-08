module EDN
  class Reader

    def initialize(source)
      @parser = EDN.new_parser(source)
    end

    def read(eof_value = NOTHING)
      result = @parser.read
      if result == EOF 
        raise "Unexpected end of file" if eof_value == NOTHING
        return eof_value
      end
      result
    end

    def each
      until (result = @parser.read) == EOF
        yield result
      end
    end
  end
end
