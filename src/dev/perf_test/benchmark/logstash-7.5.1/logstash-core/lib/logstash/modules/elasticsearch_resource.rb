# encoding: utf-8
require_relative "resource_base"

module LogStash module Modules class ElasticsearchResource
  include ResourceBase
  def import_path
    base + "/" + content_id
  end
end end end
