package castro.backend.dao;

import java.util.Optional;

// Follow the Java DAO pattern here: http://java-design-patterns.com/patterns/dao/
public interface GenericDao<T extends Object> {

  Optional<T> getById(Long id);

  boolean add(Long id, T t);

  boolean update(Long id, T t);

  boolean deleteById(Long id);
}
