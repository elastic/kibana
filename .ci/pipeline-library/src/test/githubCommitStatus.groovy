import org.junit.*
import static org.mockito.Mockito.*;

class GithubCommitStatusTest extends KibanaBasePipelineTest {
  def githubCommitStatus
  def githubApiMock
  def buildStateMock

  def EXPECTED_STATUS_URL = 'repos/elastic/kibana/statuses/COMMIT_HASH'
  def EXPECTED_CONTEXT = 'kibana-ci'
  def EXPECTED_BUILD_URL = 'http://jenkins.localhost:8080/job/elastic+kibana+master/1/'

  interface BuildState {
    Object get(String key)
  }

  interface GithubApi {
    Object post(String url, Map data)
  }

  @Before
  void setUp() {
    super.setUp()

    buildStateMock = mock(BuildState)
    githubApiMock = mock(GithubApi)

    when(buildStateMock.get('checkoutInfo')).thenReturn([ commit: 'COMMIT_HASH', ])
    when(githubApiMock.post(any(), any())).thenReturn(null)

    props([
      buildState: buildStateMock,
      githubApi: githubApiMock,
    ])

    githubCommitStatus = loadScript("vars/githubCommitStatus.groovy")
  }

  void verifyStatusCreate(String state, String description) {
    verify(githubApiMock).post(
      EXPECTED_STATUS_URL,
      [
        'state': state,
        'description': description,
        'context': EXPECTED_CONTEXT,
        'target_url': EXPECTED_BUILD_URL,
      ]
    )
  }

  @Test
  void 'onStart() should create a pending status'() {
    githubCommitStatus.onStart()
    verifyStatusCreate('pending', 'Build started.')
  }

  @Test
  void 'onFinish() should create a success status'() {
    githubCommitStatus.onFinish()
    verifyStatusCreate('success', 'Build completed successfully.')
  }

  @Test
  void 'onFinish() should create an error status for failed builds'() {
    mockFailureBuild()
    githubCommitStatus.onFinish()
    verifyStatusCreate('error', 'Build failed.')
  }

  @Test
  void 'onStart() should exit early for PRs'() {
    prop('githubPr', [ isPr: { true } ])

    githubCommitStatus.onStart()
    verifyZeroInteractions(githubApiMock)
  }

  @Test
  void 'onFinish() should exit early for PRs'() {
    prop('githubPr', [ isPr: { true } ])

    githubCommitStatus.onFinish()
    verifyZeroInteractions(githubApiMock)
  }
}
