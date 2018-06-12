package castro.elasticsearch.dao;

import com.google.protobuf.GeneratedMessageV3;
import org.elasticsearch.client.RestHighLevelClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

public abstract class ElasticsearchDao<T extends GeneratedMessageV3> {
  private Logger logger = LoggerFactory.getLogger(getClass());

  // Old TransportClient is deprecated
  private RestHighLevelClient client;

  protected ElasticsearchDao(RestHighLevelClient client) {
    this.client = client;
  }

  void save(T t) {
//    client.
  }

  T findById(String id) {
    return null;
  }

  void close() {
    try {
      client.close();
    } catch (IOException e) {
      logger.error("Close error", e);
    }
  }
}
