package castro.backend.controllers;

import castro.repository.Repository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

// The pattern is a workaround to make implementations methods to inherit annotations
// https://stackoverflow.com/questions/8002514/spring-mvc-annotated-controller-interface-with-pathvariable
// https://jira.spring.io/browse/SPR-11055

@RequestMapping(value = "/api/repository", produces = MediaType.APPLICATION_JSON_VALUE)
public interface RepositoryApi {
  @RequestMapping(value = "/{id}")
  default Repository repository(@PathVariable String id) {
    return repositoryImpl(id);
  }
  Repository repositoryImpl(String id);

  @RequestMapping(value = "/{id}", method = RequestMethod.POST)
  default void repository(@PathVariable String id, @RequestBody Repository repo) {
    repositoryImpl(id, repo);
  }
  void repositoryImpl(String id, Repository repo);
}