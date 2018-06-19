package castro.backend.controllers;

import castro.repository.Repository;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RepositoryApiController implements RepositoryApi {
  private Logger logger = LoggerFactory.getLogger(getClass());

  @Override
  public Repository repositoryImpl(String id) {
    logger.debug("Repository {}", id);
    return Repository.newBuilder().setDomain("github.com").setMainBranch("master").setRepositoryId(id).build();
  }

  @Override
  public void repositoryImpl(String id, Repository repo) {
    try {
      logger.info("update {}", JsonFormat.printer().print(repo));
    } catch (InvalidProtocolBufferException e) {
//      e.printStackTrace();
    }
  }
}
