# encoding: utf-8
require "logstash/api/commands/base"

module LogStash
  module Api
    module Commands
      module System
        class Plugins < Commands::Base
          def run
            { :total => plugins.count, :plugins => plugins }
          end

          private

          def plugins
            @plugins ||= find_plugins_gem_specs.map do |spec|
              { :name => spec.name, :version => spec.version.to_s }
            end.sort_by do |spec|
              spec[:name]
            end
          end

          def find_plugins_gem_specs
            @specs ||= ::Gem::Specification.find_all.select{|spec| logstash_plugin_gem_spec?(spec)}
          end

          def logstash_plugin_gem_spec?(spec)
            spec.metadata && spec.metadata["logstash_plugin"] == "true"
          end

        end
      end
    end
  end
end
