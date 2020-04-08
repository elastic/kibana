# encoding: utf-8

module LogStash module Filters
  class ArrayOfMapsValueUpdate
    def initialize(iterate_on, field, destination, fallback, lookup)
      @iterate_on = ensure_reference_format(iterate_on)
      @field = ensure_reference_format(field)
      @destination = ensure_reference_format(destination)
      @fallback = fallback
      @use_fallback = !fallback.nil? # fallback is not nil, the user set a value in the config
      @lookup = lookup
    end

    def test_for_inclusion(event, override)
      event.include?(@iterate_on)
    end

    def update(event)
      val = event.get(@iterate_on) # should be an array of hashes
      source = Array(val)
      matches = Array.new(source.size)
      source.size.times do |index|
        nested_field = "#{@iterate_on}[#{index}]#{@field}"
        nested_destination = "#{@iterate_on}[#{index}]#{@destination}"
        inner = event.get(nested_field)
        next if inner.nil?
        matched = [true, nil]
        @lookup.fetch_strategy.fetch(inner.to_s, matched)
        if matched.first
          event.set(nested_destination, matched.last)
          matches[index] = true
        elsif @use_fallback
          event.set(nested_destination, event.sprintf(@fallback))
          matches[index] = true
        end
      end
      return matches.any?
    end

    def ensure_reference_format(field)
      field.start_with?("[") && field.end_with?("]") ? field : "[#{field}]"
    end
  end
end end
