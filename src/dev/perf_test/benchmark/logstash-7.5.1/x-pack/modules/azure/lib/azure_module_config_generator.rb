# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'logstash/namespace'

module LogStash
  module Azure
    class ConfigGenerator

      def generate_input(module_hash)
        lines = []
        config = []
        module_hash.each do |k, v|
          config << {parse_key(k) => v} if k.start_with?('var.input.azure_event_hubs') && !k.eql?('var.input.azure_event_hubs.event_hubs')
        end
        mode = :basic
        event_hubs = module_hash['var.input.azure_event_hubs.event_hubs']
        if event_hubs
          raise "Invalid configuration. 'var.input.azure_event_hubs.event_hubs' must be a set of arrays. Please check your configuration." unless event_hubs.is_a?(Array) && event_hubs.size > 1 && event_hubs[0][0].eql?('name')
          reference = event_hubs[0]
          if reference.is_a?(Array)
            mode = :advanced
            # convert parallel arrays to array of hashes
            advanced_config = []
            event_hubs.size.times do |x| # process event hubs north -> south
              hub_array = []
              next if x == 0 # skip reference array, reference array must be in position 0
              reference.each_with_index do |key, y| # process the reference array west -> east
                next if y == 0 # skip the 'name' in the reference array
                hub_array << {key => event_hubs[x][y]} # for each item in the reference array, create a hash of reference key to the correct x,y axis, add to array
              end
              advanced_config << {event_hubs[x][0] => hub_array} # for each event hub create a hash keyed by the hub name. Note the hub name must always be position 0.
            end
            config << {'event_hubs' => advanced_config} # add the advanced config to the main config... advanced config will always take precedence via the plugin.
          end
        end

        basic_valid = false
        advanced_valid = false
        lines << '# start azure_event_hubs' # helps with testing
        # write the config to the buffer
        config.each do |c|
          c.each do |k, v|
            if v.is_a?(Array) && k.eql?('event_hubs') && mode.eql?(:advanced)
              lines << '  config_mode => "advanced"'
              lines << '  ' + k + ' => ['
              v.each_with_index do |entry, i|
                if mode.eql?(:advanced)
                  entry.each do |_k, _v|
                    lines << '    {"' + _k + '" => {'
                    _v.each do |_entry|
                      _entry.each do |__k, __v|
                        advanced_valid = true if __k.eql?('event_hub_connection')
                        lines << '      ' + format_key_value(__k, __v)
                      end
                    end
                    lines << '    ' + '}}' + (i < v.length - 1 ? ',' : '')
                  end
                end
              end
              lines << '  ' + ']'
            end
            if k.eql?('event_hub_connections')
              v.each do |connection|
                basic_valid = connection.include?('EntityPath')
              end
            end
            lines << '  ' + format_key_value(k, v) unless k.eql?('event_hubs')
          end
        end
        lines << '# end azure_event_hubs' # helps with testing
        raise "Invalid configuration. 'var.input.azure_event_hubs.event_hub_connections' must be set, and the connection string must contain the EntityPath." if mode.eql?(:basic) && !basic_valid
        raise "Invalid configuration. Could not parse out 'var.input.azure_event_hubs.event_hubs'. Please check your configuration." if mode.eql?(:advanced) && !advanced_valid

        <<-CONF
  azure_event_hubs {
    #{lines.compact.join("\n    ")}
  }
        CONF
      end

      def format_key_value(key, value)
        key.to_s + ' => ' + format_value(value)
      end

      def parse_key(key)
        key.split('.').last
      end

      def format_value(value)
        # protects against special symbols in value string
        if value.is_a?(String)
          '"' + value + '"'
        else
          value.to_s
        end
      end
    end
  end
end
