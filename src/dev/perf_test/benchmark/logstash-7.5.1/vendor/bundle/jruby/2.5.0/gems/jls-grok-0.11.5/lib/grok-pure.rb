 require "rubygems"
require "logger"
require "cabin"
require "grok/pure/discovery"
require "grok/pure/match"

# TODO(sissel): Check if 'grok' c-ext has been loaded and abort?
class Grok
  class PatternError < StandardError; end

  # The pattern input
  attr_accessor :pattern

  # The fully-expanded pattern (in regex form)
  attr_accessor :expanded_pattern

  # The logger
  attr_accessor :logger

  # The dictionary of pattern names to pattern expressions
  attr_accessor :patterns

  PATTERN_RE = \
    /%\{    # match '%{' not prefixed with '\'
       (?<name>     # match the pattern name
         (?<pattern>[A-z0-9]+)
         (?::(?<subname>[@\[\]A-z0-9_:.-]+))?
       )
       (?:=(?<definition>
         (?:
           (?:[^{}\\]+|\\.+)+
           |
           (?<curly>\{(?:(?>[^{}]+|(?>\\[{}])+)|(\g<curly>))*\})+
         )+
       ))?
       [^}]*
     \}/x

  GROK_OK = 0
  GROK_ERROR_FILE_NOT_ACCESSIBLE = 1
  GROK_ERROR_PATTERN_NOT_FOUND = 2
  GROK_ERROR_UNEXPECTED_READ_SIZE = 3
  GROK_ERROR_COMPILE_FAILED = 4
  GROK_ERROR_UNINITIALIZED = 5
  GROK_ERROR_PCRE_ERROR = 6
  GROK_ERROR_NOMATCH = 7

  public
  def initialize
    @patterns = {}
    @logger = Cabin::Channel.new
    @logger.subscribe(Logger.new(STDOUT))
    @logger.level = :warn
    # Captures Lambda which is generated at Grok compile time and called at match time
    @captures_func = nil

    # TODO(sissel): Throw exception if we aren't using Ruby 1.9.2 or newer.
  end # def initialize

  public
  def add_pattern(name, pattern)
    @logger.debug("Adding pattern", name => pattern)
    @patterns[name] = pattern
    return nil
  end # def add_pattern

  public
  def add_patterns_from_file(path)
    file = File.new(path, "r")
    file.each do |line|
      # Skip comments
      next if line =~ /^\s*#/
      # File format is: NAME ' '+ PATTERN '\n'
      name, pattern = line.gsub(/^\s*/, "").split(/\s+/, 2)
      #p name => pattern
      # If the line is malformed, skip it.
      next if pattern.nil?
      # Trim newline and add the pattern.
      add_pattern(name, pattern.chomp)
    end
    return nil
  ensure
    file.close
  end # def add_patterns_from_file

  public
  def compile(pattern, named_captures_only=false)
    iterations_left = 10000
    @pattern = pattern
    @expanded_pattern = pattern.clone

    # Replace any instances of '%{FOO}' with that pattern.
    loop do
      if iterations_left == 0
        raise PatternError, "Deep recursion pattern compilation of #{pattern.inspect} - expanded: #{@expanded_pattern.inspect}"
      end
      iterations_left -= 1
      m = PATTERN_RE.match(@expanded_pattern)
      break if !m

      if m["definition"]
        add_pattern(m["pattern"], m["definition"])
      end

      if @patterns.include?(m["pattern"])
        regex = @patterns[m["pattern"]]
        name = m["name"]

        if named_captures_only && name.index(":").nil?
          # this has no semantic (pattern:foo) so we don't need to capture
          replacement_pattern = "(?:#{regex})"
        else
          replacement_pattern = "(?<#{name}>#{regex})"
        end

        # Ruby's String#sub() has a bug (or misfeature) that causes it to do bad
        # things to backslashes in string replacements, so let's work around it
        # See this gist for more details: https://gist.github.com/1491437
        # This hack should resolve LOGSTASH-226.
        @expanded_pattern.sub!(m[0]) { |s| replacement_pattern }
        @logger.debug? and @logger.debug("replacement_pattern => #{replacement_pattern}")
      else
        raise PatternError, "pattern #{m[0]} not defined"
      end
    end

    @regexp = Regexp.new(@expanded_pattern, Regexp::MULTILINE)
    @logger.debug? and @logger.debug("Grok compiled OK", :pattern => pattern,
                                     :expanded_pattern => @expanded_pattern)

    @captures_func = compile_captures_func(@regexp)
  end

  private
  # compiles the captures lambda so runtime match can be optimized
  def compile_captures_func(re)
    re_match = ["lambda do |match, &block|"]
    re.named_captures.each do |name, indices|
      pattern, name, coerce = name.split(":")
      indices.each do |index|
        coerce = case coerce
                   when "int"; ".to_i"
                   when "float"; ".to_f"
                   else; ""
                 end
        name = pattern if name.nil?
        if coerce
          re_match << "  m = match[#{index}]"
          re_match << "  block.call(#{name.inspect}, (m ? m#{coerce} : m))"
        else
          re_match << "  block.call(#{name.inspect}, match[#{index}])"
        end
      end
    end
    re_match << "end"
    return eval(re_match.join("\n"))
  end # def compile_captures_func

  public
  def match(text)
    match = @regexp.match(text)
    if match
      grokmatch = Grok::Match.new
      grokmatch.subject = text
      grokmatch.grok = self
      grokmatch.match = match
      @logger.debug? and @logger.debug("Regexp match object", :names => match.names,
                                       :captures => match.captures)
      return grokmatch
    else
      return false
    end
  end # def match

  # Returns the matched regexp object directly for performance at the
  # cost of usability.
  #
  # Returns MatchData on success, nil on failure.
  #
  # Can be used with #capture
  def execute(text)
    @regexp.match(text)
  end

  # Optimized match and capture instead of calling them separately
  # This could be DRYed up by using #match and #capture directly
  # but there's a bit of a worry that that may lower perf.
  # This should be benchmarked!
  def match_and_capture(text)
    match = execute(text)
    if match
      @logger.debug? and @logger.debug("Regexp match object", :names => match.names,
                                       :captures => match.captures)
      capture(match) {|k,v| yield k,v}
      return true
    else
      return false
    end
  end # def match_and_capture

  def capture(match, &block)    
    @captures_func.call(match,&block)
  end # def capture

  public
  def discover(input)
    init_discover if @discover == nil

    return @discover.discover(input)
  end # def discover

  private
  def init_discover
    require "grok/pure/discovery"
    @discover = Grok::Discovery.new(self)
    @discover.logger = @logger
  end # def init_discover

end # Grok
