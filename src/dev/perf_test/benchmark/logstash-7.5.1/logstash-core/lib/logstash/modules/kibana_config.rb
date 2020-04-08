# encoding: utf-8
require_relative "file_reader"
require_relative "kibana_settings"
require_relative "kibana_dashboards"
require_relative "kibana_resource"

module LogStash module Modules class KibanaConfig
  include LogStash::Util::Loggable

  ALLOWED_DIRECTORIES = ["search", "visualization"]
  attr_reader :index_name # not used when importing via kibana but for BWC with ElasticsearchConfig

  # We name it `modul` here because `module` has meaning in Ruby.
  def initialize(modul, settings)
    build_versioned_directory(modul)
    @name = modul.module_name
    @settings = settings
    @index_name = "kibana"
    @pattern_name = "#{@name}-*"
    @kibana_settings = [
      KibanaSettings::Setting.new("defaultIndex", @pattern_name)
    ]
  end

  def dashboards
    # there can be more than one dashboard to load
    filenames = FileReader.read_json(dynamic("dashboard"))
    filenames.map do |filename|
      KibanaResource.new(@index_name, "dashboard", dynamic("dashboard", filename))
    end
  end

  def index_pattern
    [KibanaResource.new(@index_name, "index-pattern", dynamic("index-pattern"),nil, @pattern_name)]
  end

  def resources
    list = index_pattern
    dashboards.each do |board|
      list << board
      extract_panels_into(board, list)
    end
    list.concat(extract_saved_searches_into(list))
    [
      KibanaSettings.new("api/kibana/settings", @kibana_settings),
      KibanaDashboards.new("api/kibana/dashboards/import", list)
    ]
  end

  private

  def build_versioned_directory(modul)
    # try to detect which directory holds the config for the kibana version
    base_dir = ::File.join(modul.directory, "kibana")
    maj, min, patch = modul.kibana_version_parts
    version_dir = "#{maj}.#{min}.#{patch}"
    @directory = ::File.join(base_dir, version_dir)
    return if ::File.directory?(@directory)
    version_dir = "#{maj}.#{min}.x"
    @directory = ::File.join(base_dir, version_dir)
    return if ::File.directory?(@directory)
    version_dir = "#{maj}.x"
    @directory = ::File.join(base_dir, version_dir)
    unless ::File.directory?(@directory)
      logger.error("Cannot find kibana version sub-directory", :module => @name, :base_directory => base_dir)
    end
  end

  def dynamic(dynamic_folder, filename = @name)
    ::File.join(@directory, dynamic_folder, "#{filename}.json")
  end

  def extract_panels_into(dashboard, list)
    dash = dashboard.content_as_object

    if !dash.is_a?(Hash)
      logger.warn("Kibana dashboard JSON is not an Object", :module => @name)
      return
    end

    panelsjson = dash["panelsJSON"]

    if panelsjson.nil?
      logger.info("No panelJSON key found in kibana dashboard", :module => @name)
      return
    end

    begin
      panels = LogStash::Json.load(panelsjson)
    rescue => e
      logger.error("JSON parse error when reading kibana panelsJSON", :module => @name)
      return
    end

    panels.each do |panel|
      panel_type = panel["type"]
      if ALLOWED_DIRECTORIES.member?(panel_type)
        list << KibanaResource.new(@index_name, panel_type, dynamic(panel_type, panel["id"]))
      else
        logger.warn("panelJSON contained unknown type", :type => panel_type)
      end
    end
  end

  def extract_saved_searches_into(list)
    result = [] # must not add to list while iterating
    list.each do |resource|
      content = resource.content_as_object
      next if content.nil?
      next unless content.keys.include?("savedSearchId")
      saved_search = content["savedSearchId"]
      next if saved_search.nil?
      ss_resource = KibanaResource.new(@index_name, "search", dynamic("search", saved_search))
      next if list.member?(ss_resource) || result.member?(ss_resource)
      result << ss_resource
    end
    result
  end
end end end
