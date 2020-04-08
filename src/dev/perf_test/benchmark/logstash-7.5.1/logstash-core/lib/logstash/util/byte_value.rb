# encoding: utf-8

module LogStash; module Util; module ByteValue
  module_function

  B = 1
  KB = B << 10
  MB = B << 20
  GB = B << 30
  TB = B << 40
  PB = B << 50

  def parse(text)
    if !text.is_a?(String)
      raise ArgumentError, "ByteValue::parse takes a String, got a `#{text.class.name}`"
    end
    number = text.to_f
    factor = multiplier(text)

    (number * factor).to_i
  end

  def multiplier(text)
    case text
      when /(?:k|kb)$/
        KB
      when /(?:m|mb)$/
        MB
      when /(?:g|gb)$/
        GB
      when /(?:t|tb)$/
        TB
      when /(?:p|pb)$/
        PB
      when /(?:b)$/
        B
      else
        raise ArgumentError, "Unknown bytes value '#{text}'"
    end
  end

  def human_readable(number)
    value, unit = if number > PB
      [number / PB, "pb"]
    elsif number > TB
      [number / TB, "tb"]
    elsif number > GB
      [number / GB, "gb"]
    elsif number > MB
      [number / MB, "mb"]
    elsif number > KB
      [number / KB, "kb"]
    else
      [number, "b"]
    end

    format("%.2d%s", value, unit)
  end
end end end
