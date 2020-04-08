require 'strscan'

class Mustache
  # The Parser is responsible for taking a string template and
  # converting it into an array of tokens and, really, expressions. It
  # raises SyntaxError if there is anything it doesn't understand and
  # knows which sigil corresponds to which tag type.
  #
  # For example, given this template:
  #
  #   Hi {{thing}}!
  #
  # Run through the Parser we'll get these tokens:
  #
  #   [:multi,
  #     [:static, "Hi "],
  #     [:mustache, :etag, "thing"],
  #     [:static, "!\n"]]
  #
  # You can see the array of tokens for any template with the
  # mustache(1) command line tool:
  #
  #   $ mustache --tokens test.mustache
  #   [:multi, [:static, "Hi "], [:mustache, :etag, "thing"], [:static, "!\n"]]
  class Parser
    # A SyntaxError is raised when the Parser comes across unclosed
    # tags, sections, illegal content in tags, or anything of that
    # sort.
    class SyntaxError < StandardError
      def initialize(message, position)
        @message = message
        @lineno, @column, @line, _ = position
        @stripped_line = @line.strip
        @stripped_column = @column - (@line.size - @line.lstrip.size)
      end

      def to_s
        <<-EOF
#{@message}
  Line #{@lineno}
    #{@stripped_line}
    #{' ' * @stripped_column}^
EOF
      end
    end

    # The sigil types which are valid after an opening `{{`
    VALID_TYPES = [ '#', '^', '/', '=', '!', '<', '>', '&', '{' ].map &:freeze

    def self.valid_types
      @valid_types ||= Regexp.new(VALID_TYPES.map { |t| Regexp.escape(t) }.join('|') )
    end

    # Add a supported sigil type (with optional aliases) to the Parser.
    #
    # Requires a block, which will be sent the following parameters:
    #
    # * content - The raw content of the tag
    # * fetch- A mustache context fetch expression for the content
    # * padding - Indentation whitespace from the currently-parsed line
    # * pre_match_position - Location of the scanner before a match was made
    #
    # The provided block will be evaluated against the current instance of
    # Parser, and may append to the Parser's @result as needed.
    def self.add_type(*types, &block)
      types = types.map(&:to_s)
      type, *aliases = types
      method_name = "scan_tag_#{type}".to_sym
      define_method(method_name, &block)
      aliases.each { |a| alias_method "scan_tag_#{a}", method_name }
      types.each { |t| VALID_TYPES << t unless VALID_TYPES.include?(t) }
      @valid_types = nil
    end

    # After these types of tags, all whitespace until the end of the line will
    # be skipped if they are the first (and only) non-whitespace content on
    # the line.
    SKIP_WHITESPACE = [ '#', '^', '/', '<', '>', '=', '!' ].map &:freeze

    # The content allowed in a tag name.
    ALLOWED_CONTENT = /(\w|[?!\/.-])*/

    # These types of tags allow any content,
    # the rest only allow ALLOWED_CONTENT.
    ANY_CONTENT = [ '!', '=' ].map &:freeze

    attr_reader :scanner, :result
    attr_writer :otag, :ctag

    # Accepts an options hash which does nothing but may be used in
    # the future.
    def initialize(options = {})
      @options = {}
    end

    # The opening tag delimiter. This may be changed at runtime.
    def otag
      @otag ||= '{{'
    end

    # The closing tag delimiter. This too may be changed at runtime.
    def ctag
      @ctag ||= '}}'
    end

    # Given a string template, returns an array of tokens.
    def compile(template)
      if template.respond_to?(:encoding)
        @encoding = template.encoding
        template = template.dup.force_encoding("BINARY")
      else
        @encoding = nil
      end

      # Keeps information about opened sections.
      @sections = []
      @result = [:multi]
      @scanner = StringScanner.new(template)

      # Scan until the end of the template.
      until @scanner.eos?
        scan_tags || scan_text
      end

      if !@sections.empty?
        # We have parsed the whole file, but there's still opened sections.
        type, pos, result = @sections.pop
        error "Unclosed section #{type.inspect}", pos
      end

      @result
    end

    # Find {{mustaches}} and add them to the @result array.
    def scan_tags
      # Scan until we hit an opening delimiter.
      start_of_line = @scanner.beginning_of_line?
      pre_match_position = @scanner.pos
      last_index = @result.length

      return unless x = @scanner.scan(/([ \t]*)?#{Regexp.escape(otag)}/)
      padding = @scanner[1] || ''

      # Don't touch the preceding whitespace unless we're matching the start
      # of a new line.
      unless start_of_line
        @result << [:static, padding] unless padding.empty?
        pre_match_position += padding.length
        padding = ''
      end

      # Since {{= rewrites ctag, we store the ctag which should be used
      # when parsing this specific tag.
      current_ctag = self.ctag
      type = @scanner.scan(self.class.valid_types)
      @scanner.skip(/\s*/)

      # ANY_CONTENT tags allow any character inside of them, while
      # other tags (such as variables) are more strict.
      content = if ANY_CONTENT.include?(type)
        r = /\s*#{regexp(type)}?#{regexp(current_ctag)}/
        scan_until_exclusive(r)
      else
        @scanner.scan(ALLOWED_CONTENT)
      end

      # We found {{ but we can't figure out what's going on inside.
      error "Illegal content in tag" if content.empty?

      fetch = [:mustache, :fetch, content.split('.')]
      prev = @result

      # Based on the sigil, do what needs to be done.
      if type
        # Method#call proves much faster than using send
        method("scan_tag_#{type}").
          call(content, fetch, padding, pre_match_position)
      else
        @result << [:mustache, :etag, fetch, offset]
      end
      # The closing } in unescaped tags is just a hack for
      # aesthetics.
      type = "}" if type == "{"

      # Skip whitespace and any balancing sigils after the content
      # inside this tag.
      @scanner.skip(/\s+/)
      @scanner.skip(regexp(type)) if type

      # Try to find the closing tag.
      unless close = @scanner.scan(regexp(current_ctag))
        error "Unclosed tag"
      end

      # If this tag was the only non-whitespace content on this line, strip
      # the remaining whitespace.  If not, but we've been hanging on to padding
      # from the beginning of the line, re-insert the padding as static text.
      if start_of_line && !@scanner.eos?
        if @scanner.peek(2) =~ /\r?\n/ && SKIP_WHITESPACE.include?(type)
          @scanner.skip(/\r?\n/)
        else
          prev.insert(last_index, [:static, padding]) unless padding.empty?
        end
      end

      # Store off the current scanner position now that we've closed the tag
      # and consumed any irrelevant whitespace.
      @sections.last[1] << @scanner.pos unless @sections.empty?

      return unless @result == [:multi]
    end

    # Try to find static text, e.g. raw HTML with no {{mustaches}}.
    def scan_text
      text = scan_until_exclusive(/(^[ \t]*)?#{Regexp.escape(otag)}/)

      if text.nil?
        # Couldn't find any otag, which means the rest is just static text.
        text = @scanner.rest
        # Mark as done.
        @scanner.terminate
      end

      text.force_encoding(@encoding) if @encoding

      @result << [:static, text] unless text.empty?
    end

    # Scans the string until the pattern is matched. Returns the substring
    # *excluding* the end of the match, advancing the scan pointer to that
    # location. If there is no match, nil is returned.
    def scan_until_exclusive(regexp)
      pos = @scanner.pos
      if @scanner.scan_until(regexp)
        @scanner.pos -= @scanner.matched.size
        @scanner.pre_match[pos..-1]
      end
    end

    def offset
      position[0, 2]
    end

    # Returns [lineno, column, line]
    def position
      # The rest of the current line
      rest = @scanner.check_until(/\n|\Z/).to_s.chomp

      # What we have parsed so far
      parsed = @scanner.string[0...@scanner.pos]

      lines = parsed.split("\n")

      [ lines.size, lines.last.size - 1, lines.last + rest ]
    end

    # Used to quickly convert a string into a regular expression
    # usable by the string scanner.
    def regexp(thing)
      /#{Regexp.escape(thing)}/
    end

    # Raises a SyntaxError. The message should be the name of the
    # error - other details such as line number and position are
    # handled for you.
    def error(message, pos = position)
      raise SyntaxError.new(message, pos)
    end

    # These methods are called in `scan_tags`. Because they contain nonstandard
    # characters in their method names, they are defined using define_method.

    define_method 'scan_tag_#' do |content, fetch, padding, pre_match_position|
      block = [:multi]
      @result << [:mustache, :section, fetch, offset, block]
      @sections << [content, position, @result]
      @result = block
    end

    define_method 'scan_tag_^' do |content, fetch, padding, pre_match_position|
      block = [:multi]
      @result << [:mustache, :inverted_section, fetch, offset, block]
      @sections << [content, position, @result]
      @result = block
    end

    define_method 'scan_tag_/' do |content, fetch, padding, pre_match_position|
      section, pos, result = @sections.pop
      raw = @scanner.pre_match[pos[3]...pre_match_position] + padding
      (@result = result).last << raw << [self.otag, self.ctag]

      if section.nil?
        error "Closing unopened #{content.inspect}"
      elsif section != content
        error "Unclosed section #{section.inspect}", pos
      end
    end

    define_method 'scan_tag_!' do |content, fetch, padding, pre_match_position|
    end

    define_method 'scan_tag_=' do |content, fetch, padding, pre_match_position|
      self.otag, self.ctag = content.split(' ', 2)
    end

    define_method 'scan_tag_>' do |content, fetch, padding, pre_match_position|
      @result << [:mustache, :partial, content, offset, padding]
    end
    alias_method :'scan_tag_<', :'scan_tag_>'

    define_method 'scan_tag_{' do |content, fetch, padding, pre_match_position|
      @result << [:mustache, :utag, fetch, offset]
    end
    alias_method :'scan_tag_&', :'scan_tag_{'

  end
end
