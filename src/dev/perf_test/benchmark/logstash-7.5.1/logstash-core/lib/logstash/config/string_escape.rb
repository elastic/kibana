

module LogStash; module Config; module StringEscape
  class << self
    def process_escapes(input)
      input.gsub(/\\./) do |value|
        process(value)
      end
    end

    private
    def process(value)
      case value[1]
      when '"', "'", "\\"
        value[1]
      when "n"
        "\n"
      when "r"
        "\r"
      when "t"
        "\t"
      else
        value
      end
    end
  end
end end end
