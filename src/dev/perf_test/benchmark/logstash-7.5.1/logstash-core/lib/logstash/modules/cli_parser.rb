# encoding: utf-8
module LogStash module Modules class CLIParser
  include LogStash::Util::Loggable

  attr_reader :output
  def initialize(module_names, module_variables)
    @output = []
    # The #compact here catches instances when module_variables may be nil or
    # [nil] and sets it to []
    parse_it(module_names, Array(module_variables).compact)
  end

  def parse_modules(module_list)
    parsed_modules = []
    module_list.each do |module_value|
      # Calling --modules but not filling it results in [nil], so skip that.
      next if module_value.nil?
      # Catch if --modules was launched empty but an option/flag (-something)
      # follows immediately after
      if module_value.start_with?('-')
        raise LogStash::ConfigLoadingError, I18n.t("logstash.modules.configuration.modules-invalid-name", :module_name => module_value)
      end
      parsed_modules.concat module_value.split(',')
    end
    parsed_modules
  end

  def get_kv(module_name, unparsed)
    # Ensure that there is at least 1 equals sign in our variable string
    # Using String#partition to split on the first '='
    # This hackery is to catch the possibility of an equals (`=`) sign
    # in a passphrase, which might result in an incomplete key.  The
    # portion before the first `=` should always be the key, leaving
    # the rest to be the value
    k, op, rest = unparsed.partition('=')
    if rest.size.zero?
      raise LogStash::ConfigLoadingError, I18n.t("logstash.modules.configuration.modules-variables-malformed", :rawvar => (module_name + '.' + unparsed))
    end
    return k.strip, rest.strip
  end

  def name_splitter(unparsed)
    # It must have at least `modulename.something`
    module_name, dot, rest = unparsed.partition('.')
    if rest.count('.') >= 1
      return module_name, rest
    else
      raise LogStash::ConfigLoadingError, I18n.t("logstash.modules.configuration.modules-variables-malformed", :rawvar => unparsed)
    end
  end

  def parse_vars(module_name, vars_list)
    module_hash = {"name" => module_name}
    vars_list.each do |unparsed|
      extracted_name, modvar = name_splitter(unparsed)
      next if extracted_name != module_name
      k, v = get_kv(extracted_name, modvar)
      module_hash[k] = v
    end
    module_hash
  end

  def parse_it(module_list, module_variable_list)
    if module_list.is_a?(Array)
      parse_modules(module_list).each do |module_name|
        @output << parse_vars(module_name, module_variable_list)
      end
    end
  end
end end end
