# encoding: utf-8

module LogStash module Filters
  class ArrayOfValuesUpdate
    class CoerceArray
      def call(source) source; end
    end
    class CoerceOther
      def call(source) Array(source); end
    end

    def initialize(iterate_on, destination, fallback, lookup)
      @iterate_on = iterate_on
      @destination = destination
      @fallback = fallback
      @use_fallback = !fallback.nil? # fallback is not nil, the user set a value in the config
      @lookup = lookup
      @coercers_table = {}
      @coercers_table.default = CoerceOther.new
      @coercers_table[Array] = CoerceArray.new
    end

    def test_for_inclusion(event, override)
      # Skip translation in case @destination iterate_on already exists and @override is disabled.
      return false if !override && event.include?(@destination)
      event.include?(@iterate_on)
    end

    def update(event)
      val = event.get(@iterate_on)
      source = @coercers_table[val.class].call(val)
      target = Array.new(source.size)
      if @use_fallback
        target.fill(event.sprintf(@fallback))
      end
      source.each_with_index do |inner, index|
        matched = [true, nil]
        @lookup.fetch_strategy.fetch(inner.to_s, matched)
        if matched.first
          target[index] = matched.last
        end
      end
      event.set(@destination, target)
      return target.any?
    end
  end
end end
