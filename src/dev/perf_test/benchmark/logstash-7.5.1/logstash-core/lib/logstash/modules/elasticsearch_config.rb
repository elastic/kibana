# encoding: utf-8
require_relative "elasticsearch_resource"

module LogStash module Modules class ElasticsearchConfig
  attr_reader :index_name

  # We name it `modul` here because `module` has meaning in Ruby.
  def initialize(modul, settings)
    @directory = ::File.join(modul.directory, "elasticsearch")
    @name = modul.module_name
    @settings = settings
    @full_path = ::File.join(@directory, "#{@name}.json")
    @index_name = @settings.fetch("elasticsearch.template_path", "_template")
  end

  def resources
    [ElasticsearchResource.new(@index_name, "not-used", @full_path)]
  end
end end end
