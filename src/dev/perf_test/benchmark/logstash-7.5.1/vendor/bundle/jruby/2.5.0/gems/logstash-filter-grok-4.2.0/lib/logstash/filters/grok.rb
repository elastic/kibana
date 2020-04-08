  # encoding: utf-8
  require "logstash/filters/base"
  require "logstash/namespace"
  require "logstash/environment"
  require "logstash/patterns/core"
  require "grok-pure" # rubygem 'jls-grok'
  require "set"
  require "timeout"

  # Parse arbitrary text and structure it.
  #
  # Grok is currently the best way in Logstash to parse unstructured log
  # data into something structured and queryable.
  #
  # This tool is perfect for syslog logs, apache and other webserver logs, mysql
  # logs, and in general, any log format that is generally written for humans
  # and not computer consumption.
  #
  # Logstash ships with about 120 patterns by default. You can find them here:
  # <https://github.com/logstash-plugins/logstash-patterns-core/tree/master/patterns>. You can add
  # your own trivially. (See the `patterns_dir` setting)
  #
  # If you need help building patterns to match your logs, you will find the
  # <http://grokdebug.herokuapp.com> and <http://grokconstructor.appspot.com/> applications quite useful!
  #
  # ==== Grok Basics
  #
  # Grok works by combining text patterns into something that matches your
  # logs.
  #
  # The syntax for a grok pattern is `%{SYNTAX:SEMANTIC}`
  #
  # The `SYNTAX` is the name of the pattern that will match your text. For
  # example, `3.44` will be matched by the `NUMBER` pattern and `55.3.244.1` will
  # be matched by the `IP` pattern. The syntax is how you match.
  #
  # The `SEMANTIC` is the identifier you give to the piece of text being matched.
  # For example, `3.44` could be the duration of an event, so you could call it
  # simply `duration`. Further, a string `55.3.244.1` might identify the `client`
  # making a request.
  #
  # For the above example, your grok filter would look something like this:
  # [source,ruby]
  # %{NUMBER:duration} %{IP:client}
  #
  # Optionally you can add a data type conversion to your grok pattern. By default
  # all semantics are saved as strings. If you wish to convert a semantic's data type,
  # for example change a string to an integer then suffix it with the target data type.
  # For example `%{NUMBER:num:int}` which converts the `num` semantic from a string to an
  # integer. Currently the only supported conversions are `int` and `float`.
  #
  # .Examples:
  #
  # With that idea of a syntax and semantic, we can pull out useful fields from a
  # sample log like this fictional http request log:
  # [source,ruby]
  #     55.3.244.1 GET /index.html 15824 0.043
  #
  # The pattern for this could be:
  # [source,ruby]
  #     %{IP:client} %{WORD:method} %{URIPATHPARAM:request} %{NUMBER:bytes} %{NUMBER:duration}
  #
  # A more realistic example, let's read these logs from a file:
  # [source,ruby]
  #     input {
  #       file {
  #         path => "/var/log/http.log"
  #       }
  #     }
  #     filter {
  #       grok {
  #         match => { "message" => "%{IP:client} %{WORD:method} %{URIPATHPARAM:request} %{NUMBER:bytes} %{NUMBER:duration}" }
  #       }
  #     }
  #
  # After the grok filter, the event will have a few extra fields in it:
  #
  # * `client: 55.3.244.1`
  # * `method: GET`
  # * `request: /index.html`
  # * `bytes: 15824`
  # * `duration: 0.043`
  #
  # ==== Regular Expressions
  #
  # Grok sits on top of regular expressions, so any regular expressions are valid
  # in grok as well. The regular expression library is Oniguruma, and you can see
  # the full supported regexp syntax https://github.com/kkos/oniguruma/blob/master/doc/RE[on the Oniguruma
  # site].
  #
  # ==== Custom Patterns
  #
  # Sometimes logstash doesn't have a pattern you need. For this, you have
  # a few options.
  #
  # First, you can use the Oniguruma syntax for named capture which will
  # let you match a piece of text and save it as a field:
  # [source,ruby]
  #     (?<field_name>the pattern here)
  #
  # For example, postfix logs have a `queue id` that is an 10 or 11-character
  # hexadecimal value. I can capture that easily like this:
  # [source,ruby]
  #     (?<queue_id>[0-9A-F]{10,11})
  #
  # Alternately, you can create a custom patterns file.
  #
  # * Create a directory called `patterns` with a file in it called `extra`
  #   (the file name doesn't matter, but name it meaningfully for yourself)
  # * In that file, write the pattern you need as the pattern name, a space, then
  #   the regexp for that pattern.
  #
  # For example, doing the postfix queue id example as above:
  # [source,ruby]
  #     # contents of ./patterns/postfix:
  #     POSTFIX_QUEUEID [0-9A-F]{10,11}
  #
  # Then use the `patterns_dir` setting in this plugin to tell logstash where
  # your custom patterns directory is. Here's a full example with a sample log:
  # [source,ruby]
  #     Jan  1 06:25:43 mailserver14 postfix/cleanup[21403]: BEF25A72965: message-id=<20130101142543.5828399CCAF@mailserver14.example.com>
  # [source,ruby]
  #     filter {
  #       grok {
  #         patterns_dir => ["./patterns"]
  #         match => { "message" => "%{SYSLOGBASE} %{POSTFIX_QUEUEID:queue_id}: %{GREEDYDATA:syslog_message}" }
  #       }
  #     }
  #
  # The above will match and result in the following fields:
  #
  # * `timestamp: Jan  1 06:25:43`
  # * `logsource: mailserver14`
  # * `program: postfix/cleanup`
  # * `pid: 21403`
  # * `queue_id: BEF25A72965`
  # * `syslog_message: message-id=<20130101142543.5828399CCAF@mailserver14.example.com>`
  #
  # The `timestamp`, `logsource`, `program`, and `pid` fields come from the
  # `SYSLOGBASE` pattern which itself is defined by other patterns.
  #
  # Another option is to define patterns _inline_ in the filter using `pattern_definitions`.
  # This is mostly for convenience and allows user to define a pattern which can be used just in that
  # filter. This newly defined patterns in `pattern_definitions` will not be available outside of that particular `grok` filter.
  #
  class LogStash::Filters::Grok < LogStash::Filters::Base
    config_name "grok"

    # A hash of matches of field => value
    #
    # For example:
    # [source,ruby]
    #     filter {
    #       grok { match => { "message" => "Duration: %{NUMBER:duration}" } }
    #     }
    #
    # If you need to match multiple patterns against a single field, the value can be an array of patterns
    # [source,ruby]
    #     filter {
    #       grok { match => { "message" => [ "Duration: %{NUMBER:duration}", "Speed: %{NUMBER:speed}" ] } }
    #     }

    #
    config :match, :validate => :hash, :default => {}

    #
    # Logstash ships by default with a bunch of patterns, so you don't
    # necessarily need to define this yourself unless you are adding additional
    # patterns. You can point to multiple pattern directories using this setting.
    # Note that Grok will read all files in the directory matching the patterns_files_glob
    # and assume it's a pattern file (including any tilde backup files).
    # [source,ruby]
    #     patterns_dir => ["/opt/logstash/patterns", "/opt/logstash/extra_patterns"]
    #
    # Pattern files are plain text with format:
    # [source,ruby]
    #     NAME PATTERN
    #
    # For example:
    # [source,ruby]
    #     NUMBER \d+
    #
    # The patterns are loaded when the pipeline is created.
    config :patterns_dir, :validate => :array, :default => []

    # A hash of pattern-name and pattern tuples defining custom patterns to be used by 
    # the current filter. Patterns matching existing names will override the pre-existing 
    # definition. Think of this as inline patterns available just for this definition of 
    # grok
    config :pattern_definitions, :validate => :hash, :default => {}

    # Glob pattern, used to select the pattern files in the directories
    # specified by patterns_dir
    config :patterns_files_glob, :validate => :string, :default => "*"

    # Break on first match. The first successful match by grok will result in the
    # filter being finished. If you want grok to try all patterns (maybe you are
    # parsing different things), then set this to false.
    config :break_on_match, :validate => :boolean, :default => true

    # If `true`, only store named captures from grok.
    config :named_captures_only, :validate => :boolean, :default => true

    # If `true`, keep empty captures as event fields.
    config :keep_empty_captures, :validate => :boolean, :default => false

    # Append values to the `tags` field when there has been no
    # successful match
    config :tag_on_failure, :validate => :array, :default => ["_grokparsefailure"]

    # Attempt to terminate regexps after this amount of time.
    # This applies per pattern if multiple patterns are applied
    # This will never timeout early, but may take a little longer to timeout.
    # Actual timeout is approximate based on a 250ms quantization.
    # Set to 0 to disable timeouts
    config :timeout_millis, :validate => :number, :default => 30000

    # When multiple patterns are provided to `match`,
    # the timeout has historically applied to _each_ pattern, incurring overhead
    # for each and every pattern that is attempted; when the grok filter is
    # configured with `timeout_scope => 'event'`, the plugin instead enforces
    # a single timeout across all attempted matches on the event, so it can
    # achieve similar safeguard against runaway matchers with significantly
    # less overhead.
    # It's usually better to scope the timeout for the whole event.
    config :timeout_scope, :validate => %w(pattern event), :default => "pattern"

    # Tag to apply if a grok regexp times out.
    config :tag_on_timeout, :validate => :string, :default => '_groktimeout'

    # The fields to overwrite.
    #
    # This allows you to overwrite a value in a field that already exists.
    #
    # For example, if you have a syslog line in the `message` field, you can
    # overwrite the `message` field with part of the match like so:
    # [source,ruby]
    #     filter {
    #       grok {
    #         match => { "message" => "%{SYSLOGBASE} %{DATA:message}" }
    #         overwrite => [ "message" ]
    #       }
    #     }
    #
    # In this case, a line like `May 29 16:37:11 sadness logger: hello world`
    # will be parsed and `hello world` will overwrite the original message.
    config :overwrite, :validate => :array, :default => []

    # Register default pattern paths
    @@patterns_path ||= Set.new
    @@patterns_path += [
      LogStash::Patterns::Core.path,
      LogStash::Environment.pattern_path("*")
    ]

    def register
      # a cache of capture name handler methods.
      @handlers = {}

      @patternfiles = []

      # Have @@patterns_path show first. Last-in pattern definitions win; this
      # will let folks redefine built-in patterns at runtime.
      @patternfiles += patterns_files_from_paths(@@patterns_path.to_a, "*")
      @patternfiles += patterns_files_from_paths(@patterns_dir, @patterns_files_glob)

      @patterns = Hash.new { |h,k| h[k] = [] }

      @logger.debug("Match data", :match => @match)

      @metric_match_fields = metric.namespace(:patterns_per_field)

      @match.each do |field, patterns|
        patterns = [patterns] if patterns.is_a?(String)
        @metric_match_fields.gauge(field, patterns.length)

        @logger.trace("Grok compile", :field => field, :patterns => patterns)
        patterns.each do |pattern|
          @logger.debug? and @logger.debug("regexp: #{@type}/#{field}", :pattern => pattern)
          grok = Grok.new
          grok.logger = @logger unless @logger.nil?
          add_patterns_from_files(@patternfiles, grok)
          add_patterns_from_inline_definition(@pattern_definitions, grok)
          grok.compile(pattern, @named_captures_only)
          @patterns[field] << grok
        end
      end # @match.each
      @match_counter = metric.counter(:matches)
      @failure_counter = metric.counter(:failures)

      @timeout = @timeout_millis > 0.0 ? RubyTimeout.new(@timeout_millis) : NoopTimeout::INSTANCE
      @matcher = ( @timeout_scope.eql?('event') ? EventTimeoutMatcher : PatternTimeoutMatcher ).new(self)
    end # def register

    def filter(event)
      matched = false

      @logger.debug? and @logger.debug("Running grok filter", :event => event)

      @patterns.each do |field, groks|
        if match(groks, field, event)
          matched = true
          break if @break_on_match
        end
        #break if done
      end # @patterns.each

      if matched
        @match_counter.increment(1)
        filter_matched(event)
      else
        @failure_counter.increment(1)
        @tag_on_failure.each {|tag| event.tag(tag)}
      end

      @logger.debug? and @logger.debug("Event now: ", :event => event)
    rescue GrokTimeoutException => e
      @logger.warn(e.message)
      metric.increment(:timeouts)
      event.tag(@tag_on_timeout)
    end # def filter

    def close
    end

    private

    def match(groks, field, event)
      input = event.get(field)
      if input.is_a?(Array)
        success = false
        input.each do |input|
          success |= match_against_groks(groks, field, input, event)
        end
        return success
      else
        match_against_groks(groks, field, input, event)
      end
    rescue StandardError => e
      @logger.warn("Grok regexp threw exception", :exception => e.message, :backtrace => e.backtrace, :class => e.class.name)
      return false
    end

    def match_against_groks(groks, field, input, event)
      # Convert anything else to string (number, hash, etc)
      context = GrokContext.new(field, input.to_s)
      @matcher.match(context, groks, event, @break_on_match)
    end

    # Internal (base) helper to handle the global timeout switch.
    # @private
    class Matcher

      def initialize(filter)
        @filter = filter
      end

      def match(context, groks, event, break_on_match)
        matched = false

        groks.each do |grok|
          context.set_grok(grok)

          matched = execute(context, grok)
          if matched
            grok.capture(matched) { |field, value| @filter.handle(field, value, event) }
            break if break_on_match
          end
        end

        matched
      end

      protected

      def execute(context, grok)
        grok.execute(context.input)
      end

    end

    # @private
    class EventTimeoutMatcher < Matcher
      # @override
      def match(context, groks, event, break_on_match)
        @filter.with_timeout(context) { super }
      end
    end

    # @private
    class PatternTimeoutMatcher < Matcher
      # @override
      def execute(context, grok)
        @filter.with_timeout(context) { super }
      end
    end

    def handle(field, value, event)
      return if (value.nil? || (value.is_a?(String) && value.empty?)) unless @keep_empty_captures

      if @overwrite.include?(field)
        event.set(field, value)
      else
        v = event.get(field)
        if v.nil?
          event.set(field, value)
        elsif v.is_a?(Array)
          # do not replace the code below with:
          #   event[field] << value
          # this assumes implementation specific feature of returning a mutable object
          # from a field ref which should not be assumed and will change in the future.
          v << value
          event.set(field, v)
        elsif v.is_a?(String)
          # Promote to array since we aren't overwriting.
          event.set(field, [v, value])
        end
      end
    end
    public :handle

    def patterns_files_from_paths(paths, glob)
      patternfiles = []
      @logger.debug("Grok patterns path", :paths => paths)
      paths.each do |path|
        if File.directory?(path)
          path = File.join(path, glob)
        end

        Dir.glob(path).each do |file|
          @logger.trace("Grok loading patterns from file", :path => file)
          if File.directory?(file)
            @logger.debug("Skipping path because it is a directory", :path => file)
          else
            patternfiles << file
          end
        end
      end
      patternfiles
    end # def patterns_files_from_paths

    def add_patterns_from_files(paths, grok)
      paths.each do |path|
        if !File.exists?(path)
          raise "Grok pattern file does not exist: #{path}"
        end
        grok.add_patterns_from_file(path)
      end
    end # def add_patterns_from_files

    def add_patterns_from_inline_definition(pattern_definitions, grok)
      pattern_definitions.each do |name, pattern|
        next if pattern.nil?
        grok.add_pattern(name, pattern.chomp)
      end
    end

    class TimeoutError < RuntimeError; end

    class GrokTimeoutException < Exception
      attr_reader :grok, :field, :value

      def initialize(grok, field, value)
        @grok = grok
        @field = field
        @value = value
      end

      def message
        "Timeout executing grok '#{@grok.pattern}' against field '#{field}' with value '#{trunc_value}'!"
      end

      def trunc_value
        if value.size <= 255 # If no more than 255 chars
          value
        else
          "Value too large to output (#{value.bytesize} bytes)! First 255 chars are: #{value[0..255]}"
        end
      end
    end

    def with_timeout(context, &block)
      @timeout.exec(&block)
    rescue TimeoutError => error
      handle_timeout(context, error)
    end
    public :with_timeout

    def handle_timeout(context, error)
      raise GrokTimeoutException.new(context.grok, context.field, context.input)
    end

    # @private
    class GrokContext
      attr_reader :grok, :field, :input

      def initialize(field, input)
        @field = field
        @input = input
      end

      def set_grok(grok)
        @grok = grok
      end
    end

    # @private
    class NoopTimeout
      INSTANCE = new

      def exec
        yield
      end
    end

    # @private
    class RubyTimeout
      def initialize(timeout_millis)
        # divide by float to allow fractional seconds, the Timeout class timeout value is in seconds but the underlying
        # executor resolution is in microseconds so fractional second parameter down to microseconds is possible.
        # see https://github.com/jruby/jruby/blob/9.2.7.0/core/src/main/java/org/jruby/ext/timeout/Timeout.java#L125
        @timeout_seconds = timeout_millis / 1000.0
      end

      def exec(&block)
        Timeout.timeout(@timeout_seconds, TimeoutError, &block)
      end
    end
  end # class LogStash::Filters::Grok
