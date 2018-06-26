package castro.backend.api;

import castro.backend.config.ElasticSearchConfig;
import castro.backend.dao.GenericDao;
import castro.backend.dao.PersonElasticSearchDao;
import castro.model.Person;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.concurrent.CompletableFuture;

@Controller
public class PersonApiController extends AbstractController implements PersonApi {
  private Logger logger = LoggerFactory.getLogger(getClass());

  GenericDao<Person> personDao;

  @Autowired
  public PersonApiController(ObjectMapper objectMapper, HttpServletRequest request, ElasticSearchConfig config) {
    super(objectMapper, request);
    this.personDao = new PersonElasticSearchDao(config);
  }

  @Override
  public CompletableFuture<ResponseEntity<Void>> createPerson(String id, @Valid Person person) {
    logger.debug("Create Person with id {}: {}", id, person.toString());
    this.personDao.add(Long.parseLong(id), person);
    return CompletableFuture.completedFuture(new ResponseEntity<>(HttpStatus.OK));
  }

  @Override
  public CompletableFuture<ResponseEntity<Void>> deletePerson(String id) {
    logger.debug("Delete Person with id {}", id);
    this.personDao.deleteById(Long.parseLong(id));
    return CompletableFuture.completedFuture(new ResponseEntity<>(HttpStatus.NO_CONTENT));
  }

  @Override
  public CompletableFuture<ResponseEntity<Person>> findPerson(String id) {
    logger.debug("Find Person with id {}", id);
    var unknownPerson = new Person().firstName("Unknown").lastName("Unknown");
    var person = this.personDao.getById(Long.parseLong(id)).orElse(unknownPerson);
    return CompletableFuture.completedFuture(new ResponseEntity<>(person, HttpStatus.OK));
  }

  @Override
  public CompletableFuture<ResponseEntity<Void>> updatePerson(String id, @Valid Person person) {
    logger.debug("Update Person with id {}: {}", id, person.toString());
    this.personDao.update(Long.parseLong(id), person);
    return CompletableFuture.completedFuture(new ResponseEntity<>(HttpStatus.OK));
  }
}
