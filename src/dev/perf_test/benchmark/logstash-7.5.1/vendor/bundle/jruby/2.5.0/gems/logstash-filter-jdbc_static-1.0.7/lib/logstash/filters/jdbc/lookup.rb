# encoding: utf-8
require_relative "lookup_result"
require "logstash/util/loggable"

module LogStash module Filters module Jdbc
  class Lookup
    include LogStash::Util::Loggable

    class Sprintfier
      def initialize(param)
        @param = param
      end

      def fetch(event, result)
        formatted = event.sprintf(@param)
        if formatted == @param # no field found so no transformation
          result.invalid_parameters_push(@param)
        end
        formatted
      end
    end

    class Getfier
      def initialize(param)
        @param = param
      end

      def fetch(event, result)
        value = event.get(@param)
        if value.nil? || value.is_a?(Hash) || value.is_a?(Array) # Array or Hash is not suitable
          result.invalid_parameters_push(@param)
        end
        value
      end
    end

    def self.find_validation_errors(array_of_options)
      if !array_of_options.is_a?(Array)
        return "The options must be an Array"
        end
      errors = []
      array_of_options.each_with_index do |options, i|
        instance = new(options, {}, "lookup-#{i.next}")
        unless instance.valid?
          errors << instance.formatted_errors
        end
      end
      return nil if errors.empty?
      errors.join("; ")
    end

    attr_reader :id, :target, :query, :parameters

    def initialize(options, globals, default_id)
      @id = options["id"] || default_id
      @target = options["target"]
      @id_used_as_target = @target.nil?
      if @id_used_as_target
        @target = @id
      end
      @options = options
      @globals = globals
      @valid = false
      @option_errors = []
      @default_result = nil
      parse_options
    end

    def id_used_as_target?
      @id_used_as_target
    end

    def valid?
      @valid
    end

    def formatted_errors
      @option_errors.join(", ")
    end

    def enhance(local, event)
      result = fetch(local, event) # should return a LookupResult

      if result.failed? || result.parameters_invalid?
        tag_failure(event)
      end

      if result.valid?
        if @use_default && result.empty?
          tag_default(event)
          process_event(event, @default_result)
        else
          process_event(event, result)
        end
        true
      else
        false
      end
    end

    private

    def tag_failure(event)
      @tag_on_failure.each do |tag|
        event.tag(tag)
      end
    end

    def tag_default(event)
      @tag_on_default_use.each do |tag|
        event.tag(tag)
      end
    end

    def fetch(local, event)
      result = LookupResult.new()
      if @parameters_specified
        params = prepare_parameters_from_event(event, result)
        if result.parameters_invalid?
          logger.warn? && logger.warn("Parameter field not found in event", :lookup_id => @id, :invalid_parameters => result.invalid_parameters)
          return result
        end
      else
        params = {}
      end
      begin
        logger.debug? && logger.debug("Executing Jdbc query", :lookup_id => @id, :statement => query, :parameters => params)
        local.fetch(query, params).each do |row|
          stringified = row.inject({}){|hash,(k,v)| hash[k.to_s] = v; hash} #Stringify row keys
          result.push(stringified)
        end
      rescue ::Sequel::Error => e
        # all sequel errors are a subclass of this, let all other standard or runtime errors bubble up
        result.failed!
        logger.warn? && logger.warn("Exception when executing Jdbc query", :lookup_id => @id, :exception => e.message, :backtrace => e.backtrace.take(8))
      end
      # if either of: no records or a Sequel exception occurs the payload is
      # empty and the default can be substituted later.
      result
    end

    def process_event(event, result)
      # use deep clone here so other filter function don't taint the payload by reference
      event.set(@target, ::LogStash::Util.deep_clone(result.payload))
    end

    def prepare_parameters_from_event(event, result)
      @symbol_parameters.inject({}) do |hash,(k,v)|
        value = v.fetch(event, result)
        hash[k] = value.is_a?(::LogStash::Timestamp) ? value.time : value
        hash
      end
    end

    def sprintf_or_get(v)
      v.match(/%{([^}]+)}/) ? Sprintfier.new(v) : Getfier.new(v)
    end

    def parse_options
      @query = @options["query"]
      unless @query && @query.is_a?(String)
        @option_errors << "The options for '#{@id}' must include a 'query' string"
      end

      @parameters = @options["parameters"]
      @parameters_specified = false
      if @parameters
        if !@parameters.is_a?(Hash)
          @option_errors << "The 'parameters' option for '#{@id}' must be a Hash"
        else
          # this is done once per lookup at start, i.e. Sprintfier.new et.al is done once.
          @symbol_parameters = @parameters.inject({}) {|hash,(k,v)| hash[k.to_sym] = sprintf_or_get(v) ; hash }
          # the user might specify an empty hash parameters => {}
          # maybe due to an unparameterised query
          @parameters_specified = !@symbol_parameters.empty?
        end
      end

      default_hash = @options["default_hash"]
      if default_hash && !default_hash.empty?
        @default_result = LookupResult.new()
        @default_result.push(default_hash)
      end

      @use_default = !@default_result.nil?

      @tag_on_failure = @options["tag_on_failure"] || @globals["tag_on_failure"] || []
      @tag_on_default_use = @options["tag_on_default_use"] || @globals["tag_on_default_use"] || []

      @valid = @option_errors.empty?
    end
  end
end end end
