module LogStash; module Outputs; class ElasticSearch
  class TemplateManager
    # To be mixed into the elasticsearch plugin base
    def self.install_template(plugin)
      return unless plugin.manage_template
      if plugin.template.nil?
        plugin.logger.info("Using default mapping template")
      else
        plugin.logger.info("Using mapping template from", :path => plugin.template)
      end


      template = get_template(plugin.template, plugin.maximum_seen_major_version)
      add_ilm_settings_to_template(plugin, template) if plugin.ilm_in_use?
      plugin.logger.info("Attempting to install template", :manage_template => template)
      install(plugin.client, template_name(plugin), template, plugin.template_overwrite)
    rescue => e
      plugin.logger.error("Failed to install template.", :message => e.message, :class => e.class.name, :backtrace => e.backtrace)
    end

    private
    def self.get_template(path, es_major_version)
      template_path = path || default_template_path(es_major_version)
      read_template_file(template_path)
    end

    def self.install(client, template_name, template, template_overwrite)
      client.template_install(template_name, template, template_overwrite)
    end

    def self.add_ilm_settings_to_template(plugin, template)
      # Overwrite any index patterns, and use the rollover alias. Use 'index_patterns' rather than 'template' for pattern
      # definition - remove any existing definition of 'template'
      template.delete('template') if template.include?('template')
      template['index_patterns'] = "#{plugin.ilm_rollover_alias}-*"
      if template['settings'] && (template['settings']['index.lifecycle.name'] || template['settings']['index.lifecycle.rollover_alias'])
        plugin.logger.info("Overwriting index lifecycle name and rollover alias as ILM is enabled.")
      end
      template['settings'].update({ 'index.lifecycle.name' => plugin.ilm_policy, 'index.lifecycle.rollover_alias' => plugin.ilm_rollover_alias})
    end

    # Template name - if template_name set, use it
    #                 if not and ILM is enabled, use the rollover alias
    #                 else use the default value of template_name
    def self.template_name(plugin)
      plugin.ilm_in_use? && !plugin.original_params.key?('template_name') ? plugin.ilm_rollover_alias : plugin.template_name
    end

    def self.default_template_path(es_major_version)
      template_version = es_major_version == 1 ? 2 : es_major_version
      default_template_name = "elasticsearch-template-es#{template_version}x.json"
      ::File.expand_path(default_template_name, ::File.dirname(__FILE__))
    end

    def self.read_template_file(template_path)
      raise ArgumentError, "Template file '#{template_path}' could not be found!" unless ::File.exists?(template_path)
      template_data = ::IO.read(template_path)
      LogStash::Json.load(template_data)
    end
  end
end end end
