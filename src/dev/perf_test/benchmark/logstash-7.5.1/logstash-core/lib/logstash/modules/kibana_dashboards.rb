# encoding: utf-8
require_relative "kibana_base"

module LogStash module Modules class KibanaDashboards < KibanaBase
  include LogStash::Util::Loggable

  attr_reader :import_path, :content

  # content is a list of kibana file resources
  def initialize(import_path, content)
    @import_path, @content = import_path, content
  end

  def import(client)
    # e.g. curl "http://localhost:5601/api/kibana/dashboards/import"
    # extract and prepare all objects
    objects = []
    content.each do |resource|
      hash = {
        "id" => resource.content_id,
        "type" => resource.content_type,
        "version" => 1,
        "attributes" => resource.content_as_object
      }
      objects << hash
    end
    body = {"version": client.version, "objects": objects}
    response = client.post(import_path, body)
    if response.failed?
      logger.error("Attempted POST failed", :url_path => import_path, :response => response.body)
    end
    response
  end
end end end
