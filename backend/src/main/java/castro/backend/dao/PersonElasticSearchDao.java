package castro.backend.dao;

import castro.backend.config.ElasticSearchConfig;
import castro.model.Person;

public class PersonElasticSearchDao extends ElasticSearchDao<Person> {

  public PersonElasticSearchDao(ElasticSearchConfig config) {
    // TODO: try to pass the index name and type name from swagger.
    super(".castro", "person", Person.class, config);
  }
}
