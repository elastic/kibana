import org.junit.*
import static groovy.test.GroovyAssert.*

class SlackNotificationsTest extends KibanaBasePipelineTest {
  def slackNotifications

  @Before
  void setUp() {
    super.setUp()

    helper.registerAllowedMethod('slackSend', [Map.class], null)
    slackNotifications = loadScript('vars/slackNotifications.groovy')
  }

  @Test
  void 'getTestFailures() should properly format failure steps'() {
    mockFailureBuild()

    def failureMessage = slackNotifications.getTestFailures()

    assertEquals(
      "*Test Failures*\n• <${Mocks.TEST_FAILURE_URL}|x-pack/test/functional/apps/fake/test·ts.Fake test &lt;Component&gt; should &amp; pass &amp;>",
      failureMessage
    )
  }

  @Test
  void 'sendFailedBuild() should call slackSend() with message'() {
    mockFailureBuild()

    slackNotifications.sendFailedBuild()

    def args = fnMock('slackSend').args[0]

    def expected = [
      channel: '#kibana-operations-alerts',
      username: 'Kibana Operations',
      iconEmoji: ':jenkins:',
      color: 'danger',
      message: ':broken_heart: elastic / kibana # master #1',
    ]

    expected.each {
      assertEquals(it.value.toString(), args[it.key].toString())
    }

    assertEquals(
      ":broken_heart: *<http://jenkins.localhost:8080/job/elastic+kibana+master/1/|elastic / kibana # master #1>*",
      args.blocks[0].text.text.toString()
    )

    assertEquals(
      "*Failed Steps*\n• <http://jenkins.localhost:8080|Execute test task>",
      args.blocks[1].text.text.toString()
    )

    assertEquals(
      "*Test Failures*\n• <https://localhost/|x-pack/test/functional/apps/fake/test·ts.Fake test &lt;Component&gt; should &amp; pass &amp;>",
      args.blocks[2].text.text.toString()
    )
  }
}
