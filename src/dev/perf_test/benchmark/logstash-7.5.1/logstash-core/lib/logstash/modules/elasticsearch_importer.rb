# encoding: utf-8
module LogStash module Modules class ElasticsearchImporter
  include LogStash::Util::Loggable

  def initialize(client)
    @client = client
  end

  def put(resource, overwrite = true)
    path = resource.import_path
    logger.debug("Attempting PUT", :url_path => path, :file_path => resource.content_path)
    if !overwrite && content_exists?(path)
      logger.debug("Found existing Elasticsearch resource.", :resource => path)
      return
    end
    put_overwrite(path, resource.content)
  end

  private

  def put_overwrite(path, content)
    if content_exists?(path)
      response = @client.delete(path)
    end
    # hmmm, versioning?
    @client.put(path, content).status == 201
  end

  def content_exists?(path)
    response = @client.head(path)
    response.status >= 200 && response.status < 300
  end

end end end # class LogStash::Modules::Importer
