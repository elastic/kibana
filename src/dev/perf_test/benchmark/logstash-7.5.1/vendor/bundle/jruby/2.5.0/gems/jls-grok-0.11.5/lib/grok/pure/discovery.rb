require "grok/namespace"
require "grok-pure"
require "logger"

class Grok::Discovery
  attr_accessor :logger

  def initialize(grok)
    @grok = grok
    @logger = Cabin::Channel.new
    @logger.subscribe(Logger.new(STDOUT))
    @logger.level = :warn
  end # def initialize

  def discover(text)
    text = text.clone
    # TODO(sissel): Sort patterns by complexity, most complex first.
    #   - For each pattern, compile it in a grok by itself.
    #   - Make a dictionary of { "name" => Grok } for each pattern
    #   - Sort groks by complexity of the Grok#expanded_pattern
    groks = {}
    @grok.patterns.each do |name, expression| 
      grok = Grok.new
      # Copy in the same grok patterns from the parent
      grok.patterns.merge!(@grok.patterns)
      grok.compile("%{#{name}}")
      groks[name] = grok
    end

    patterns = groks.sort { |a, b| compare(a, b) }

    done = false
    while !done
      done = true # will reset this if we are not done later.
      patterns.each do |name, grok|
        # Skip patterns that lack complexity (SPACE, NOTSPACE, DATA, etc)
        next if complexity(grok.expanded_pattern) < 20
        m = grok.match(text)
        # Skip non-matches
        next unless m 
        part = text[m.start ... m.end]
        # Only include things that have word boundaries (not just words)
        next if part !~ /.\b./
        # Skip over parts that appear to include %{pattern} already
        next if part =~ /%{[^}+]}/
        acting = true
        text[m.start ... m.end] = "%{#{name}}"

        # Start the loop over again
        done = false
        break
      end
    end

    return text
  end # def discover

  private
  def compare(a, b)
    # a and be are each: [ name, grok ]
    # sort highest complexity first
    return complexity(b.last.expanded_pattern) <=> complexity(a.last.expanded_pattern)
  end # def compare

  private
  def complexity(expression)
    score = expression.count("|") # number of branches in the pattern
    score += expression.length # the length of the pattern
  end # def complexity

end # class Grok::Discovery

#/* Compute the relative complexity of a pattern */
#static int complexity(const grok_t *grok) {
  #int score;
  #score += string_count(grok->full_pattern, "|");
  #score += strlen(grok->full_pattern) / 2;
  #return -score; /* Sort most-complex first */
#}
