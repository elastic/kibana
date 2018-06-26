package castro.backend.dao;

import castro.backend.config.ElasticSearchConfig;
import castro.model.Person;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.fasterxml.jackson.databind.ObjectWriter;
import org.elasticsearch.action.admin.indices.create.CreateIndexRequest;
import org.elasticsearch.action.admin.indices.create.CreateIndexResponse;
import org.elasticsearch.action.admin.indices.get.GetIndexRequest;
import org.elasticsearch.action.delete.DeleteRequest;
import org.elasticsearch.action.delete.DeleteResponse;
import org.elasticsearch.action.get.GetRequest;
import org.elasticsearch.action.get.GetResponse;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.action.index.IndexResponse;
import org.elasticsearch.action.update.UpdateRequest;
import org.elasticsearch.action.update.UpdateResponse;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.common.xcontent.XContentType;
import org.elasticsearch.rest.RestStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Optional;

public abstract class ElasticSearchDao<T extends Object> implements GenericDao<T> {
  private Logger logger = LoggerFactory.getLogger(getClass());

  private String INDEX_NAME;
  private String TYPE_NAME;

  private RestHighLevelClient esClient;

  private final Class<T> genericType;

  public ElasticSearchDao(String indexName, String typeName, Class<T> type, ElasticSearchConfig config) {
    this.esClient = config.client();
    this.genericType = type;
    this.INDEX_NAME = indexName;
    this.TYPE_NAME = typeName;

    if (this.esClient != null) {
      try {
        GetIndexRequest request = new GetIndexRequest();
        request.indices(this.INDEX_NAME);
        if (!this.esClient.indices().exists(request)) {
          CreateIndexRequest createReq = new CreateIndexRequest(this.INDEX_NAME);
          CreateIndexResponse createRes = this.esClient.indices().create(createReq);
        }
      } catch (IOException e) {
        logger.debug("Create index exception {}.", e.getLocalizedMessage());
      }
    }
  }

  @Override
  public Optional<T> getById(Long id) {
    logger.debug("Get by id {} from ElasticSearch.", id);
    GetRequest req = new GetRequest(INDEX_NAME, TYPE_NAME, id.toString());
    try {
      GetResponse res = this.esClient.get(req);
      var mapper = new ObjectMapper();
      T t = mapper.readValue(res.getSourceAsString(), this.genericType);
      return Optional.of(t);
    } catch (IOException e) {
      return Optional.empty();
    }
  }

  @Override
  public boolean add(Long id, T t) {
    logger.debug("Add a Person {} from ElasticSearch.", t.toString());
    try {
      ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter();
      String jsonStr = ow.writeValueAsString(t);
      IndexRequest req = new IndexRequest(INDEX_NAME, TYPE_NAME, id.toString());
      req.source(jsonStr, XContentType.JSON);

      IndexResponse res = this.esClient.index(req);
      return res.status() == RestStatus.CREATED;
    } catch (IOException e) {
      return false;
    }
  }

  @Override
  public boolean update(Long id, T t) {
    logger.debug("Update with new value {} from ElasticSearch.", t.toString());
    try {
      ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter();
      String jsonStr = ow.writeValueAsString(t);
      UpdateRequest req = new UpdateRequest(INDEX_NAME, TYPE_NAME, id.toString());
      req.doc(jsonStr, XContentType.JSON);

      UpdateResponse res = this.esClient.update(req);
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  @Override
  public boolean deleteById(Long id) {
    logger.debug("Delete by id {} from ElasticSearch.", id);
    DeleteRequest req = new DeleteRequest(INDEX_NAME, TYPE_NAME, id.toString());
    try {
      DeleteResponse res = this.esClient.delete(req);
      return true;
    } catch (IOException e) {
      return false;
    }
  }
}
