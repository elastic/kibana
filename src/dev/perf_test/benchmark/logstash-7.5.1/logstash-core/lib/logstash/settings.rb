# encoding: utf-8
require "fileutils"
require "logstash/util/byte_value"
require "logstash/util/substitution_variables"
require "logstash/util/time_value"

module LogStash
  class Settings

    include LogStash::Util::SubstitutionVariables
    include LogStash::Util::Loggable

    # there are settings that the pipeline uses and can be changed per pipeline instance
    PIPELINE_SETTINGS_WHITE_LIST = [
      "config.debug",
      "config.support_escapes",
      "config.reload.automatic",
      "config.reload.interval",
      "config.string",
      "dead_letter_queue.enable",
      "dead_letter_queue.max_bytes",
      "metric.collect",
      "pipeline.java_execution",
      "pipeline.plugin_classloaders",
      "path.config",
      "path.dead_letter_queue",
      "path.queue",
      "pipeline.batch.delay",
      "pipeline.batch.size",
      "pipeline.id",
      "pipeline.reloadable",
      "pipeline.system",
      "pipeline.workers",
      "queue.checkpoint.acks",
      "queue.checkpoint.interval",
      "queue.checkpoint.writes",
      "queue.checkpoint.retry",
      "queue.drain",
      "queue.max_bytes",
      "queue.max_events",
      "queue.page_capacity",
      "queue.type",
    ]


    def initialize
      @settings = {}
      # Theses settings were loaded from the yaml file
      # but we didn't find any settings to validate them,
      # lets keep them around until we do `validate_all` at that
      # time universal plugins could have added new settings.
      @transient_settings = {}
    end

    def register(setting)
      if @settings.key?(setting.name)
        raise ArgumentError.new("Setting \"#{setting.name}\" has already been registered as #{setting.inspect}")
      else
        @settings[setting.name] = setting
      end
    end

    def registered?(setting_name)
       @settings.key?(setting_name)
    end

    def get_setting(setting_name)
      setting = @settings[setting_name]
      raise ArgumentError.new("Setting \"#{setting_name}\" hasn't been registered") if setting.nil?
      setting
    end

    def get_subset(setting_regexp)
      regexp = setting_regexp.is_a?(Regexp) ? setting_regexp : Regexp.new(setting_regexp)
      settings = self.class.new
      @settings.each do |setting_name, setting|
        next unless setting_name.match(regexp)
        settings.register(setting.clone)
      end
      settings
    end

    def set?(setting_name)
      get_setting(setting_name).set?
    end

    def clone
      get_subset(".*")
    end
    alias_method :dup, :clone

    def get_default(setting_name)
      get_setting(setting_name).default
    end

    def get_value(setting_name)
      get_setting(setting_name).value
    end
    alias_method :get, :get_value

    def set_value(setting_name, value, graceful = false)
      get_setting(setting_name).set(value)
    rescue ArgumentError => e
      if graceful
        @transient_settings[setting_name] = value
      else
        raise e
      end
    end
    alias_method :set, :set_value

    def to_hash
      hash = {}
      @settings.each do |name, setting|
        hash[name] = setting.value
      end
      hash
    end

    def merge(hash, graceful = false)
      hash.each {|key, value| set_value(key, value, graceful) }
      self
    end

    def merge_pipeline_settings(hash, graceful = false)
      hash.each do |key, _|
        unless PIPELINE_SETTINGS_WHITE_LIST.include?(key)
          raise ArgumentError.new("Only pipeline related settings are expected. Received \"#{key}\". Allowed settings: #{PIPELINE_SETTINGS_WHITE_LIST}")
        end
      end
      merge(hash, graceful)
    end

    def format_settings
      output = []
      output << "-------- Logstash Settings (* means modified) ---------"
      @settings.each do |setting_name, setting|
        value = setting.value
        default_value = setting.default
        if default_value == value # print setting and its default value
          output << "#{setting_name}: #{value.inspect}" unless value.nil?
        elsif default_value.nil? # print setting and warn it has been set
          output << "*#{setting_name}: #{value.inspect}"
        elsif value.nil? # default setting not set by user
          output << "#{setting_name}: #{default_value.inspect}"
        else # print setting, warn it has been set, and show default value
          output << "*#{setting_name}: #{value.inspect} (default: #{default_value.inspect})"
        end
      end
      output << "--------------- Logstash Settings -------------------"
      output
    end

    def reset
      @settings.values.each(&:reset)
    end

    def from_yaml(yaml_path, file_name="logstash.yml")
      settings = read_yaml(::File.join(yaml_path, file_name))
      self.merge(deep_replace(flatten_hash(settings)), true)
      self
    end

    def post_process
      if @post_process_callbacks
        @post_process_callbacks.each do |callback|
          callback.call(self)
        end
      end
    end

    def on_post_process(&block)
      @post_process_callbacks ||= []
      @post_process_callbacks << block
    end

    def validate_all
      # lets merge the transient_settings again to see if new setting were added.
      self.merge(@transient_settings)

      @settings.each do |name, setting|
        setting.validate_value
      end
    end

    def ==(other)
      return false unless other.kind_of?(::LogStash::Settings)
      self.to_hash == other.to_hash
    end

    private
    def read_yaml(path)
      YAML.safe_load(IO.read(path)) || {}
    end

    def flatten_hash(h,f="",g={})
      return g.update({ f => h }) unless h.is_a? Hash
      if f.empty?
        h.each { |k,r| flatten_hash(r,k,g) }
      else
        h.each { |k,r| flatten_hash(r,"#{f}.#{k}",g) }
      end
      g
    end
  end

  class Setting
    include LogStash::Util::Loggable

    attr_reader :name, :default

    def initialize(name, klass, default=nil, strict=true, &validator_proc)
      @name = name
      unless klass.is_a?(Class)
        raise ArgumentError.new("Setting \"#{@name}\" must be initialized with a class (received #{klass})")
      end
      @klass = klass
      @validator_proc = validator_proc
      @value = nil
      @value_is_set = false
      @strict = strict

      validate(default) if @strict
      @default = default
    end

    def value
      @value_is_set ? @value : default
    end

    def set?
      @value_is_set
    end

    def strict?
      @strict
    end

    def set(value)
      validate(value) if @strict
      @value = value
      @value_is_set = true
      @value
    end

    def reset
      @value = nil
      @value_is_set = false
    end

    def to_hash
      {
        "name" => @name,
        "klass" => @klass,
        "value" => @value,
        "value_is_set" => @value_is_set,
        "default" => @default,
        # Proc#== will only return true if it's the same obj
        # so no there's no point in comparing it
        # also thereś no use case atm to return the proc
        # so let's not expose it
        #"validator_proc" => @validator_proc
      }
    end

    def ==(other)
      self.to_hash == other.to_hash
    end

    def validate_value
      validate(value)
    end

    protected
    def validate(input)
      if !input.is_a?(@klass)
        raise ArgumentError.new("Setting \"#{@name}\" must be a #{@klass}. Received: #{input} (#{input.class})")
      end

      if @validator_proc && !@validator_proc.call(input)
        raise ArgumentError.new("Failed to validate setting \"#{@name}\" with value: #{input}")
      end
    end

    class Coercible < Setting
      def initialize(name, klass, default=nil, strict=true, &validator_proc)
        @name = name
        unless klass.is_a?(Class)
          raise ArgumentError.new("Setting \"#{@name}\" must be initialized with a class (received #{klass})")
        end
        @klass = klass
        @validator_proc = validator_proc
        @value = nil
        @value_is_set = false

        if strict
          coerced_default = coerce(default)
          validate(coerced_default)
          @default = coerced_default
        else
          @default = default
        end
      end

      def set(value)
        coerced_value = coerce(value)
        validate(coerced_value)
        @value = coerce(coerced_value)
        @value_is_set = true
        @value
      end

      def coerce(value)
        raise NotImplementedError.new("Please implement #coerce for #{self.class}")
      end
    end
    ### Specific settings #####

    class Boolean < Coercible
      def initialize(name, default, strict=true, &validator_proc)
        super(name, Object, default, strict, &validator_proc)
      end

      def coerce(value)
        case value
        when TrueClass, "true"
          true
        when FalseClass, "false"
          false
        else
          raise ArgumentError.new("could not coerce #{value} into a boolean")
        end
      end
    end

    class Numeric < Coercible
      def initialize(name, default=nil, strict=true)
        super(name, ::Numeric, default, strict)
      end

      def coerce(v)
        return v if v.is_a?(::Numeric)

        # I hate these "exceptions as control flow" idioms
        # but Ruby's `"a".to_i => 0` makes it hard to do anything else.
        coerced_value = (Integer(v) rescue nil) || (Float(v) rescue nil)

        if coerced_value.nil?
          raise ArgumentError.new("Failed to coerce value to Numeric. Received #{v} (#{v.class})")
        else
          coerced_value
        end
      end
    end

    class Integer < Coercible
      def initialize(name, default=nil, strict=true)
        super(name, ::Integer, default, strict)
      end

      def coerce(value)
        return value unless value.is_a?(::String)

        coerced_value = Integer(value) rescue nil

        if coerced_value.nil?
          raise ArgumentError.new("Failed to coerce value to Integer. Received #{value} (#{value.class})")
        else
          coerced_value
        end
      end
    end

    class PositiveInteger < Integer
      def initialize(name, default=nil, strict=true)
        super(name, default, strict) do |v|
          if v > 0
            true
          else
            raise ArgumentError.new("Number must be bigger than 0. Received: #{v}")
          end
        end
      end
    end

    class Port < Integer
      VALID_PORT_RANGE = 1..65535

      def initialize(name, default=nil, strict=true)
        super(name, default, strict) { |value| valid?(value) }
      end

      def valid?(port)
        VALID_PORT_RANGE.cover?(port)
      end
    end

    class PortRange < Coercible
      PORT_SEPARATOR = "-"

      def initialize(name, default=nil, strict=true)
        super(name, ::Range, default, strict=true) { |value| valid?(value) }
      end

      def valid?(range)
        Port::VALID_PORT_RANGE.first <= range.first && Port::VALID_PORT_RANGE.last >= range.last
      end

      def coerce(value)
        case value
        when ::Range
          value
        when ::Integer
          value..value
        when ::String
          first, last = value.split(PORT_SEPARATOR)
          last = first if last.nil?
          begin
            (Integer(first))..(Integer(last))
          rescue ArgumentError # Trap and reraise a more human error
            raise ArgumentError.new("Could not coerce #{value} into a port range")
          end
        else
          raise ArgumentError.new("Could not coerce #{value} into a port range")
        end
      end

      def validate(value)
        unless valid?(value)
          raise ArgumentError.new("Invalid value \"#{value}, valid options are within the range of #{Port::VALID_PORT_RANGE.first}-#{Port::VALID_PORT_RANGE.last}")
        end
      end
    end

    class Validator < Setting
      def initialize(name, default=nil, strict=true, validator_class=nil)
        @validator_class = validator_class
        super(name, ::Object, default, strict)
      end

      def validate(value)
        @validator_class.validate(value)
      end
    end

    class String < Setting
      def initialize(name, default=nil, strict=true, possible_strings=[])
        @possible_strings = possible_strings
        super(name, ::String, default, strict)
      end

      def validate(value)
        super(value)
        unless @possible_strings.empty? || @possible_strings.include?(value)
          raise ArgumentError.new("Invalid value \"#{value}\". Options are: #{@possible_strings.inspect}")
        end
      end
    end

    class NullableString < String
      def validate(value)
        return if value.nil?
        super(value)
      end
    end

    class ExistingFilePath < Setting
      def initialize(name, default=nil, strict=true)
        super(name, ::String, default, strict) do |file_path|
          if !::File.exists?(file_path)
            raise ::ArgumentError.new("File \"#{file_path}\" must exist but was not found.")
          else
            true
          end
        end
      end
    end

    class WritableDirectory < Setting
      def initialize(name, default=nil, strict=false)
        super(name, ::String, default, strict)
      end

      def validate(path)
        super(path)

        if ::File.directory?(path)
          if !::File.writable?(path)
            raise ::ArgumentError.new("Path \"#{path}\" must be a writable directory. It is not writable.")
          end
        elsif ::File.symlink?(path)
          # TODO(sissel): I'm OK if we relax this restriction. My experience
          # is that it's usually easier and safer to just reject symlinks.
          raise ::ArgumentError.new("Path \"#{path}\" must be a writable directory. It cannot be a symlink.")
        elsif ::File.exist?(path)
          raise ::ArgumentError.new("Path \"#{path}\" must be a writable directory. It is not a directory.")
        else
          parent = ::File.dirname(path)
          if !::File.writable?(parent)
            raise ::ArgumentError.new("Path \"#{path}\" does not exist and I cannot create it because the parent path \"#{parent}\" is not writable.")
          end
        end

        # If we get here, the directory exists and is writable.
        true
      end

      def value
        super.tap do |path|
          if !::File.directory?(path)
            # Create the directory if it doesn't exist.
            begin
              logger.info("Creating directory", setting: name, path: path)
              ::FileUtils.mkdir_p(path)
            rescue => e
              # TODO(sissel): Catch only specific exceptions?
              raise ::ArgumentError.new("Path \"#{path}\" does not exist, and I failed trying to create it: #{e.class.name} - #{e}")
            end
          end
        end
      end
    end

    class Bytes < Coercible
      def initialize(name, default=nil, strict=true)
        super(name, ::Integer, default, strict=true) { |value| valid?(value) }
      end

      def valid?(value)
        value.is_a?(::Integer) && value >= 0
      end

      def coerce(value)
        case value
        when ::Numeric
          value
        when ::String
          LogStash::Util::ByteValue.parse(value)
        else
          raise ArgumentError.new("Could not coerce '#{value}' into a bytes value")
        end
      end

      def validate(value)
        unless valid?(value)
          raise ArgumentError.new("Invalid byte value \"#{value}\".")
        end
      end
    end

    class TimeValue < Coercible
      def initialize(name, default, strict=true, &validator_proc)
        super(name, ::Integer, default, strict, &validator_proc)
      end

      def coerce(value)
        return value if value.is_a?(::Integer)
        Util::TimeValue.from_value(value).to_nanos
      end
    end

    class ArrayCoercible < Coercible
      def initialize(name, klass, default, strict=true, &validator_proc)
        @element_class = klass
        super(name, ::Array, default, strict, &validator_proc)
      end

      def coerce(value)
        Array(value)
      end

      protected
      def validate(input)
        if !input.is_a?(@klass)
          raise ArgumentError.new("Setting \"#{@name}\" must be a #{@klass}. Received: #{input} (#{input.class})")
        end

        unless input.all? {|el| el.kind_of?(@element_class) }
          raise ArgumentError.new("Values of setting \"#{@name}\" must be #{@element_class}. Received: #{input.map(&:class)}")
        end

        if @validator_proc && !@validator_proc.call(input)
          raise ArgumentError.new("Failed to validate setting \"#{@name}\" with value: #{input}")
        end
      end
    end

    class SplittableStringArray < ArrayCoercible
      DEFAULT_TOKEN = ","

      def initialize(name, klass, default, strict=true, tokenizer = DEFAULT_TOKEN, &validator_proc)
        @element_class = klass
        @token = tokenizer
        super(name, klass, default, strict, &validator_proc)
      end

      def coerce(value)
        if value.is_a?(Array)
          value
        elsif value.nil?
          []
        else
          value.split(@token).map(&:strip)
        end
      end
    end

    class Modules < Coercible
      def initialize(name, klass, default = nil)
        super(name, klass, default, false)
      end

      def set(value)
        @value = coerce(value)
        @value_is_set = true
        @value
      end

      def coerce(value)
        if value.is_a?(@klass)
          return value
        end
        @klass.new(value)
      end

      protected
      def validate(value)
        coerce(value)
      end
    end

    ##
    # Instances of `DeprecatedSetting` can be registered, but will fail with helpful guidance when encountering any
    # configuration that attempts to explicitly set the value. They should be used in the Major version immediately
    # following a deprecation to assist users who are porting forward configurations.
    class DeprecatedSetting < Setting
      def initialize(name, guidance='please remove the setting from your configuration and try again.')
        super(name, Object)
        @guidance = guidance
      end

      def set(value)
        fail(ArgumentError, "The setting `#{name}` has been deprecated and removed from Logstash; #{@guidance}")
      end
    end

    # Useful when a setting has been renamed but otherwise is semantically identical
    class DeprecatedAndRenamed < DeprecatedSetting
      attr_reader :new_name
      def initialize(name, new_name)
        super(name, "please update your configuration to use `#{new_name}` instead.")
        @new_name = new_name
      end
    end
  end


  SETTINGS = Settings.new
end
