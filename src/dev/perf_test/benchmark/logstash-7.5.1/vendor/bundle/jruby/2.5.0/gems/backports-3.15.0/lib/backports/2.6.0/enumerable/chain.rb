unless Enumerable.method_defined? :chain
  module Enumerable
    def chain(*enums)
      Enumerator::Chain.new(self, *enums)
    end
  end

  Enumerator = Enumerable::Enumerator unless Object.const_defined? :Enumerator # For 1.8.x

  class Enumerator::Chain < Enumerator
    def initialize(*enums)
      @enums = enums
      @rewindable = -1
      self
    end

    def each(*args, &block)
      @enums.each_with_index do |enum, i|
        @rewindable = i
        enum.each(*args, &block)
      end
    end

    def size
      sum = 0
      @enums.each do |enum|
        s = enum.size
        return s if s == nil || s == Float::INFINITY
        sum += s
      end
      sum
    end

    def inspect
      detail = @enums.map(&:inspect).join(', ')
      "#<Enumerator::Chain: [#{detail}]>"
    end

    def rewind
      @rewindable.downto(0) do |i|
        enum = @enums[i]
        enum.rewind if enum.respond_to? :rewind
      end
      self
    end
  end unless Enumerator.const_defined? :Chain
end
