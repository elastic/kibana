package castro.backend.api;

import castro.model.Repository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;

import javax.servlet.http.HttpServletRequest;
import java.util.concurrent.CompletableFuture;

@Controller
public class RepositoryApiController extends AbstractController implements RepositoryApi {
  private Logger logger = LoggerFactory.getLogger(getClass());

  public RepositoryApiController(ObjectMapper objectMapper, HttpServletRequest request) {
    super(objectMapper, request);
  }


  public CompletableFuture<ResponseEntity<Repository>> findRepo(@ApiParam(value = "",required=true) @PathVariable("uri") String uri) {
    var repo = new Repository().uri("github.com/lambdalab/lambdalab").name("lambdalab").org("lambdalab").url("http://github.com/lambdalab/lambdalab");

    logger.info("update {}", repo.toString());

    return CompletableFuture.completedFuture(new ResponseEntity<>(repo, HttpStatus.OK));
  }
}
