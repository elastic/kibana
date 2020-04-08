# encoding: utf-8
require_relative "file_reader"
require "logstash/settings"

module LogStash module Modules class LogStashConfig
  # We name it `modul` here because `module` has meaning in Ruby.
  def initialize(modul, settings)
    @directory = ::File.join(modul.directory, "logstash")
    @name = modul.module_name
    @settings = settings
  end

  def template
    ::File.join(@directory, "#{@name}.conf.erb")
  end

  def configured_inputs(default = [], aliases = {})
    name = "var.inputs"
    values = get_setting(LogStash::Setting::SplittableStringArray.new(name, String, default))

    aliases.each { |k,v| values << v if values.include?(k) }
    aliases.invert.each { |k,v| values << v if values.include?(k) }
    values.flatten.uniq
  end

  def alias_settings_keys!(aliases)
    aliased_settings = alias_matching_keys(aliases, @settings)
    @settings = alias_matching_keys(aliases.invert, aliased_settings)
  end

  def array_to_string(array)
    "[#{array.collect { |i| "'#{i}'" }.join(", ")}]"
  end

  def csv_string(array)
    "'#{array.join(',')}'"
  end

  def get_setting(setting_class)
    raw_value = @settings[setting_class.name]
    # If we dont check for NIL, the Settings class will try to coerce the value
    # and most of the it will fails when a NIL value is explicitly set.
    # This will be fixed once we wrap the plugins settings into a Settings class
    setting_class.set(raw_value) unless raw_value.nil?
    setting_class.value
  end

  def setting(name, default)
    # by default we use the more permissive setting which is a `NullableString`
    # This is fine because the end format of the logstash configuration is a string representation
    # of the pipeline. There is a good reason why I think we should use the settings classes, we
    # can `preprocess` a template and generate a configuration from the defined settings
    # validate the values and replace them in the template.
    case default
      when String
        get_setting(LogStash::Setting::NullableString.new(name, default.to_s))
      when Numeric
        get_setting(LogStash::Setting::Numeric.new(name, default))
      when true, false
        get_setting(LogStash::Setting::Boolean.new(name, default))
      else
        get_setting(LogStash::Setting::NullableString.new(name, default.to_s))
      end
  end

  def has_setting?(name)
    @settings.key?(name)
  end

  def raw_setting(name)
    @settings[name]
  end

  def fetch_raw_setting(name, default)
    @settings.fetch(name, default)
  end

  def elasticsearch_output_config(type_string = nil)
    hosts = array_to_string(get_setting(LogStash::Setting::SplittableStringArray.new("var.elasticsearch.hosts", String, ["localhost:9200"])))
    index = "#{@name}-#{setting("var.elasticsearch.index_suffix", "%{+YYYY.MM.dd}")}"
    user = @settings["var.elasticsearch.username"]
    password = @settings["var.elasticsearch.password"]
    lines = ["hosts => #{hosts}", "index => \"#{index}\""]
    lines.push(user ? "user => \"#{user}\"" : nil)
    lines.push(password ? "password => \"#{password.value}\"" : nil)
    lines.push(type_string ? "document_type => #{type_string}" : nil)
    lines.push("ssl => #{@settings.fetch('var.elasticsearch.ssl.enabled', false)}")
    if cacert = @settings["var.elasticsearch.ssl.certificate_authority"]
      lines.push("cacert => \"#{cacert}\"") if cacert
    end
    # NOTE: the first line should be indented in the conf.erb
    <<-CONF
elasticsearch {
    #{lines.compact.join("\n    ")}
    manage_template => false
  }
CONF
  end

  def config_string
    # process the template and settings
    # send back as a string
    renderer = ERB.new(FileReader.read(template))
    renderer.result(binding)
  end

  private
  # For a first version we are copying the values of the original hash,
  # this might become problematic if we users changes the values of the
  # settings in the template, which could result in an inconsistent view of the original data
  #
  # For v1 of the feature I think its an OK compromise, v2 we have a more advanced hash that
  # support alias.
  def alias_matching_keys(aliases, target)
    aliased_target = target.dup

    aliases.each do |matching_key_prefix, new_key_prefix|
      target.each do |k, v|
        re = /^#{matching_key_prefix}\./

        if k =~ re
          alias_key = k.gsub(re, "#{new_key_prefix}.")

          # If the user setup the same values twices with different values lets just halt.
          raise "Cannot create an alias, the destination key has already a value set: original key: #{k}, alias key: #{alias_key}" if (!aliased_target[alias_key].nil? && aliased_target[alias_key] != v)
          aliased_target[alias_key] = v unless v.nil?
        end
      end
    end

    aliased_target
  end
end end end
