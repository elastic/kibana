import org.junit.*
import static groovy.test.GroovyAssert.*

class GithubCommitStatusTTest extends KibanaBasePipelineTest {
  def githubCommitStatus

  @Before
  void setUp() {
    super.setUp()

    githubCommitStatus = loadScript("vars/githubCommitStatus.groovy")
  }

  @Test
  void 'onStart()'() {

  }

  @Test
  void 'onFinish()'() {

  }
}
