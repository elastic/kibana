require 'stringio'
require 'set'


module EDN
  Parser = RubyEdnParser
  @parser_class = RubyEdnParser

  def self.parser=(p)
    @parser_class = p
  end

  def self.new_parser(*args)
    @parser_class.new(*args)
  end

  # Object returned when there is nothing to return

  NOTHING = Object.new

  # Object to return when we hit end of file. Cant be nil or :eof
  # because either of those could be something in the EDN data.

  EOF = Object.new

  # Reader table

  READERS = {}
  SYMBOL_INTERIOR_CHARS =
    Set.new(%w{. # * ! - _ + ? $ % & = < > :} + ('a'..'z').to_a + ('A'..'Z').to_a + ('0'..'9').to_a)

  SYMBOL_INTERIOR_CHARS.each {|n| READERS[n.to_s] = :read_symbol}

  DIGITS = Set.new(('0'..'9').to_a)

  DIGITS.each {|n| READERS[n.to_s] = :read_number}

  READERS.default = :unknown

  READERS['{'] = :read_map
  READERS['['] = :read_vector
  READERS['('] = :read_list
  READERS['\\'] = :read_char
  READERS['"'] = :read_string
  READERS['.'] = :read_number_or_symbol
  READERS['+'] = :read_number_or_symbol
  READERS['-'] = :read_number_or_symbol
  READERS[''] = :read_number_or_symbol
  READERS['/'] = :read_slash
  READERS[':'] = :read_keyword
  READERS['#'] = :read_extension
  READERS[:eof] = :read_eof

  def self.register_reader(ch, handler=nil, &block)
    if handler
      READERS[ch] = handler
    else
      READERS[ch] = block
    end
  end

  TAGS = {}

  def self.register(tag, func = nil, &block)
    if block_given?
      func = block
    end

    if func.nil?
      func = lambda { |x| x }
    end

    if func.is_a?(Class)
      TAGS[tag] = lambda { |*args| func.new(*args) }
    else
      TAGS[tag] = func
    end
  end

  def self.unregister(tag)
    TAGS[tag] = nil
  end

  def self.tagged_element(tag, element)
    func = TAGS[tag]
    if func
      func.call(element)
    else
      EDN::Type::Unknown.new(tag, element)
    end
  end
end
