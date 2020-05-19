import org.junit.*
import static groovy.test.GroovyAssert.*


class SlackNotificationsTest extends KibanaBasePipelineTest {
  def slackNotifications

  @Before
  void setUp() {
    super.setUp()

    slackNotifications = loadScript("vars/slackNotifications.groovy")
  }

  @Test
  void testFailures() {
    mockFailureBuild()

    def failureMessage = slackNotifications.getTestFailures()

    assertEquals(
      "*Test Failures*\n• <${Mocks.TEST_FAILURE_URL}|${Mocks.TEST_FAILURE_NAME_SHORT}>",
      failureMessage
    )
  }

  @Test
  void testSendFailedBuild() {
    mockFailureBuild()

    slackNotifications.sendFailedBuild()

    def fn = helper.callStack.find { it.methodName == 'slackSend' }
    def args = fn.args[0]

    def expected = [
      channel: "#kibana-operations-alerts",
      username: "Kibana Operations",
      iconEmoji: ":jenkins:",
      color: 'danger',
      message: ':broken_heart: elastic / kibana # master #1',
    ]

    expected.each {
      assertEquals(it.value.toString(), args[it.key].toString())
    }
  }
}
