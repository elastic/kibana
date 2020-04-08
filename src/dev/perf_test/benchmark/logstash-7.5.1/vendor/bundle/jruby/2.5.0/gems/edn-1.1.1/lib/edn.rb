$:.push(File.dirname(__FILE__))
require 'set'
require 'edn/version'
require 'edn/core_ext'
require 'edn/types'
require 'edn/metadata'
require 'edn/char_stream'
require 'edn/ruby_edn_parser'
require 'edn/parser'
require 'edn/reader'

module EDN
  @tags = Hash.new

  def self.read(edn, eof_value=NOTHING)
    EDN::Reader.new(edn).read(eof_value)
  end

  def self.register(tag, func = nil, &block)
    if block_given?
      func = block
    end

    if func.nil?
      func = lambda { |x| x }
    end

    if func.is_a?(Class)
      @tags[tag] = lambda { |*args| func.new(*args) }
    else
      @tags[tag] = func
    end
  end

  def self.unregister(tag)
    @tags[tag] = nil
  end

  def self.tagged_element(tag, element)
    func = @tags[tag]
    if func
      func.call(element)
    else
      EDN::Type::Unknown.new(tag, element)
    end
  end

  def self.tagout(tag, element)
    ["##{tag}", element.to_edn].join(" ")
  end

  def self.symbol(text)
    EDN::Type::Symbol.new(text)
  end

  def self.list(values)
    EDN::Type::List.new(*values)
  end

  def self.set(*elems)
    Set.new(*elems)
  end

  def self.big_decimal(str)
    BigDecimal.new(str)
  end
end

EDN.register("inst") do |value|
  DateTime.parse(value)
end

EDN.register("uuid") do |value|
  EDN::Type::UUID.new(value)
end

