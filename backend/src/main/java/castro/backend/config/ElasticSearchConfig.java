package castro.backend.config;

import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestHighLevelClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ElasticSearchConfig {

  private Logger logger = LoggerFactory.getLogger(getClass());

  @Value("${elasticsearch.host}")
  private String EsHost;

  @Value("${elasticsearch.port}")
  private int EsPort;

  @Value("${elasticsearch.clustername}")
  private String EsClusterName;

  @Value("${elasticsearch.scheme}")
  private String EsScheme;

  @Bean
  public RestHighLevelClient client()  {
    logger.debug("Elasticsearch config: host {}, port {}, cluster {}, scheme {}",
        this.EsHost, this.EsPort, this.EsClusterName, this.EsScheme);

    return new RestHighLevelClient(
        RestClient.builder(new HttpHost(this.EsHost, this.EsPort, this.EsScheme)));
  }

}
