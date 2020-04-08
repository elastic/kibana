unless String.method_defined? :undump
  class String
    def undump
      # Making sure to return a String and not a subclass
      string = to_s
      raise 'string contains null byte' if string["\0"]
      raise 'non-ASCII character detected' unless string.ascii_only?

      #raise '.force_encoding("...") format is not supported by backports' if string.match(/\A".*"\.force_encoding\("[^"]*"\)\z/)
      match = string.match(/\A(".*?"?)(?:\.force_encoding\("([^"]*)"\))?\z/)
      if match
        string = match[1]
        encoding = match[2]
      else
        raise %(invalid dumped string; not wrapped with '"' nor '"...".force_encoding("...")' form)
      end

      # Ruby 1.9.3 does weird things to encoding during gsub
      encoding ||= string.encoding.to_s

      # Unescaped have an even number of backslashes in front of them
      # because the double-quote is included, the unescaped quotes are where the size is odd
      nb_unescaped_quote = string.scan(/\\*"/).select { |s| s.size.odd? }.size

      raise 'unterminated dumped string' if nb_unescaped_quote == 1

      if string[-1] != '"' || nb_unescaped_quote > 2
        raise %(invalid dumped string; not wrapped with '"' nor '"...".force_encoding("...")' form)
      end

      string = string[1...-1]

      if RUBY_VERSION >= '1.9'
        # Look-arounds are not supported in ruby 1.8. Using a string with Regexp avoids the SyntaxError in 1.8.7
        # \xY, \x3Y and finishing with \x
        regex = Regexp.new("(?<!\\)(?:\\\\)*\\x(?![0-9a-f]{2})".gsub('\\', '\\\\\\\\'), Regexp::IGNORECASE)
        raise 'invalid hex escape' if string[regex]
      end

      # The real #undump ignores the \C, \c and \M escapes
      # Code injection is avoided by:
      #   * only allowing \u to have {}, so \\\\#{injection} will not eval the injection
      #   * only allowing the first character after the \\ to not be alpha/num/space, so \\\\#@inst_var_access is ignored
      # To reduce the number of calls to eval a little, we wrap everything in a (...)+ so that consecutive escapes are
      # handled at the same time.
      result = string.gsub(/(\\+(u\{[\w ]+\}|[^cCM][\w]*))+/) do |s|
        begin
          eval("\"#{s}\"")
        rescue SyntaxError => e
          raise RuntimeError, e.message, e.backtrace
        end
      end

      if encoding
        begin
          Encoding.find(encoding)
        rescue ArgumentError
          raise "dumped string has unknown encoding name"
        end
        result = result.force_encoding(encoding)
      end
      result
    end
  end
end
