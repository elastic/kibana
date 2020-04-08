# encoding: utf-8
module LogStash module Modules class KibanaImporter
  include LogStash::Util::Loggable

  def initialize(client)
    @client = client
  end

  def put(via_kibana)
    path = via_kibana.import_path
    logger.debug("Attempting POST", :url_path => path, :content => via_kibana.content)
    via_kibana.import(@client)
  end
end end end
