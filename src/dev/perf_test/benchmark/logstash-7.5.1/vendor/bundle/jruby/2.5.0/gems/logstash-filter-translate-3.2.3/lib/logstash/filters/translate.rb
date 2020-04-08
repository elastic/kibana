# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

require "logstash/filters/dictionary/memory"
require "logstash/filters/dictionary/file"
require "logstash/filters/dictionary/csv_file"
require "logstash/filters/dictionary/yaml_file"
require "logstash/filters/dictionary/json_file"

require_relative "single_value_update"
require_relative "array_of_values_update"
require_relative "array_of_maps_value_update"
# A general search and replace tool that uses a configured hash
# and/or a file to determine replacement values. Currently supported are
# YAML, JSON, and CSV files.
#
# The dictionary entries can be specified in one of two ways: First,
# the `dictionary` configuration item may contain a hash representing
# the mapping. Second, an external file (readable by logstash) may be specified
# in the `dictionary_path` configuration item. These two methods may not be used
# in conjunction; it will produce an error.
#
# Operationally, if the event field specified in the `field` configuration
# matches the EXACT contents of a dictionary entry key (or matches a regex if
# `regex` configuration item has been enabled), the field's value will be substituted
# with the matched key's value from the dictionary.
#
# By default, the translate filter will replace the contents of the
# maching event field (in-place). However, by using the `destination`
# configuration item, you may also specify a target event field to
# populate with the new translated value.
#
# Alternatively, for simple string search and replacements for just a few values
# you might consider using the gsub function of the mutate filter.
module LogStash module Filters
class Translate < LogStash::Filters::Base
  config_name "translate"

  # The name of the logstash event field containing the value to be compared for a
  # match by the translate filter (e.g. `message`, `host`, `response_code`).
  #
  # If this field is an array, only the first value will be used, unless
  # you specify `iterate_on`. See below. If you want to use another element
  # in the array then use `"[some_field][2]"`
  config :field, :validate => :string, :required => true

  # If the destination (or target) field already exists, this configuration item specifies
  # whether the filter should skip translation (default) or overwrite the target field
  # value with the new translation value.
  config :override, :validate => :boolean, :default => false

  # The dictionary to use for translation, when specified in the logstash filter
  # configuration item (i.e. do not use the `@dictionary_path` file).
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       %PLUGIN% {
  #         dictionary => [ "100", "Continue",
  #                         "101", "Switching Protocols",
  #                         "merci", "thank you",
  #                         "old version", "new version" ]
  #       }
  #     }
  #
  # NOTE: It is an error to specify both `dictionary` and `dictionary_path`.
  config :dictionary, :validate => :hash,  :default => {}

  # The full path of the external dictionary file. The format of the table should
  # be a standard YAML, JSON or CSV with filenames ending in `.yaml`, `.yml`,
  #`.json` or `.csv` to be read. Make sure you specify any integer-based keys in
  # quotes. For example, the YAML file (`.yaml` or `.yml` should look something like
  # this:
  # [source,ruby]
  #     "100": Continue
  #     "101": Switching Protocols
  #     merci: gracias
  #     old version: new version
  #
  # NOTE: it is an error to specify both `dictionary` and `dictionary_path`.
  #
  # The currently supported formats are YAML, JSON, and CSV. Format selection is
  # based on the file extension: `json` for JSON, `yaml` or `yml` for YAML, and
  # `csv` for CSV. The JSON format only supports simple key/value, unnested
  # objects. The CSV format expects exactly two columns, with the first serving
  # as the original text, and the second column as the replacement.
  config :dictionary_path, :validate => :path

  # When using a dictionary file, this setting will indicate how frequently
  # (in seconds) logstash will check the dictionary file for updates.
  config :refresh_interval, :validate => :number, :default => 300

  # The destination field you wish to populate with the translated code. The default
  # is a field named `translation`. Set this to the same value as source if you want
  # to do a substitution, in this case filter will allways succeed. This will clobber
  # the old value of the source field!
  config :destination, :validate => :string, :default => "translation"

  # When `exact => true`, the translate filter will populate the destination field
  # with the exact contents of the dictionary value. When `exact => false`, the
  # filter will populate the destination field with the result of any existing
  # destination field's data, with the translated value substituted in-place.
  #
  # For example, consider this simple translation.yml, configured to check the `data` field:
  # [source,ruby]
  #     foo: bar
  #
  # If logstash receives an event with the `data` field set to `foo`, and `exact => true`,
  # the destination field will be populated with the string `bar`.

  # If `exact => false`, and logstash receives the same event, the destination field
  # will be also set to `bar`. However, if logstash receives an event with the `data` field
  # set to `foofing`, the destination field will be set to `barfing`.
  #
  # Set both `exact => true` AND `regex => `true` if you would like to match using dictionary
  # keys as regular expressions. A large dictionary could be expensive to match in this case.
  config :exact, :validate => :boolean, :default => true

  # If you'd like to treat dictionary keys as regular expressions, set `regex => true`.
  # Note: this is activated only when `exact => true`.
  config :regex, :validate => :boolean, :default => false

  # In case no translation occurs in the event (no matches), this will add a default
  # translation string, which will always populate `field`, if the match failed.
  #
  # For example, if we have configured `fallback => "no match"`, using this dictionary:
  # [source,ruby]
  #     foo: bar
  #
  # Then, if logstash received an event with the field `foo` set to `bar`, the destination
  # field would be set to `bar`. However, if logstash received an event with `foo` set to `nope`,
  # then the destination field would still be populated, but with the value of `no match`.
  # This configuration can be dynamic and include parts of the event using the `%{field}` syntax.
  config :fallback, :validate => :string

  # When using a dictionary file, this setting indicates how the update will be executed.
  # Setting this to `merge` leads to entries removed from the dictionary file being kept; `replace`
  # deletes old entries on update.
  config :refresh_behaviour, :validate => ['merge', 'replace'], :default => 'merge'

  # When the value that you need to perform enrichment on is a  variable sized array then specify
  # the field name in this setting. This setting introduces two modes, 1) when the value is an
  # array of strings and 2) when the value is an array of objects (as in JSON object).
  # In the first mode, you should have the same field name in both `field` and `iterate_on`, the
  # result will be an array added to the field specified in the `destination` setting. This array
  # will have the looked up value (or the `fallback` value or nil) in same ordinal position
  # as each sought value. In the second mode, specify the field that has the array of objects
  # then specify the field in each object that provides the sought value with `field` and
  # the field to write the looked up value (or the `fallback` value) to with `destination`
  config :iterate_on, :validate => :string

  attr_reader :lookup # for testing reloading

  def register
    if @dictionary_path && !@dictionary.empty?
      raise LogStash::ConfigurationError, I18n.t(
        "logstash.agent.configuration.invalid_plugin_register",
        :plugin => "filter",
        :type => "translate",
        :error => "The configuration options 'dictionary' and 'dictionary_path' are mutually exclusive"
      )
    end

    if @dictionary_path
      @lookup = Dictionary::File.create(@dictionary_path, @refresh_interval, @refresh_behaviour, @exact, @regex)
    else
      @lookup = Dictionary::Memory.new(@dictionary, @exact, @regex)
    end
    if @iterate_on.nil?
      @updater = SingleValueUpdate.new(@field, @destination, @fallback, @lookup)
    elsif @iterate_on == @field
      @updater = ArrayOfValuesUpdate.new(@iterate_on, @destination, @fallback, @lookup)
    else
      @updater = ArrayOfMapsValueUpdate.new(@iterate_on, @field, @destination, @fallback, @lookup)
    end

    @logger.debug? && @logger.debug("#{self.class.name}: Dictionary - ", :dictionary => @lookup.dictionary)
    if @exact
      @logger.debug? && @logger.debug("#{self.class.name}: Dictionary translation method - Exact")
    else
      @logger.debug? && @logger.debug("#{self.class.name}: Dictionary translation method - Fuzzy")
    end
  end # def register

  def close
    @lookup.stop_scheduler
  end

  def filter(event)
    return unless @updater.test_for_inclusion(event, @override)
    begin
      filter_matched(event) if @updater.update(event) || @field == @destination
    rescue Exception => e
      @logger.error("Something went wrong when attempting to translate from dictionary", :exception => e, :field => @field, :event => event)
    end
  end # def filter
end # class LogStash::Filters::Translate
end end
