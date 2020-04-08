# encoding: utf-8
require_relative "resource_base"

module LogStash module Modules class KibanaResource
  include ResourceBase
  def import_path
    base + "/" + content_type + "/" + content_id
  end
end end end
