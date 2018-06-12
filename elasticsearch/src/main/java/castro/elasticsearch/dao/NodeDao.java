package castro.elasticsearch.dao;

import castro.metadata.Node;
import org.elasticsearch.client.RestHighLevelClient;

public class NodeDao extends ElasticsearchDao<Node> {
  protected NodeDao(RestHighLevelClient client) {
    super(client);
  }

  public Node findByQname(String qname) {
    return null;
  }
}
