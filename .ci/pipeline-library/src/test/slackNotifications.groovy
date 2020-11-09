import org.junit.*
import static groovy.test.GroovyAssert.*

class SlackNotificationsTest extends KibanaBasePipelineTest {
  def slackNotifications

  @Before
  void setUp() {
    super.setUp()

    helper.registerAllowedMethod('slackSend', [Map.class], null)
    prop('buildState', loadScript("vars/buildState.groovy"))
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
  void 'sendFailedBuild() should call slackSend() with an in-progress message'() {
    mockFailureBuild()

    slackNotifications.sendFailedBuild()

    def args = fnMock('slackSend').args[0]

    def expected = [
      channel: '#kibana-operations-alerts',
      username: 'Kibana Operations',
      iconEmoji: ':jenkins:',
      color: 'danger',
      message: ':hourglass_flowing_sand: elastic / kibana # master #1',
    ]

    expected.each {
      assertEquals(it.value.toString(), args[it.key].toString())
    }

    assertEquals(
      ":hourglass_flowing_sand: *<http://jenkins.localhost:8080/job/elastic+kibana+master/1/|elastic / kibana # master #1>*",
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

  @Test
  void 'sendFailedBuild() should call slackSend() with message'() {
    mockFailureBuild()

    slackNotifications.sendFailedBuild(isFinal: true)

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

  @Test
  void 'sendFailedBuild() should call slackSend() with a backup message when first attempt fails'() {
    mockFailureBuild()
    def counter = 0
    helper.registerAllowedMethod('slackSend', [Map.class], { ++counter > 1 })
    slackNotifications.sendFailedBuild(isFinal: true)

    def args = fnMocks('slackSend')[1].args[0]

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
      ":broken_heart: *<http://jenkins.localhost:8080/job/elastic+kibana+master/1/|elastic / kibana # master #1>*" +
        "\n\nFirst attempt at sending this notification failed. Please check the build.",
      args.blocks[0].text.text.toString()
    )
  }

  @Test
  void 'sendFailedBuild() should call slackSend() with a channel id and timestamp on second call'() {
    mockFailureBuild()
    helper.registerAllowedMethod('slackSend', [Map.class], { [ channelId: 'CHANNEL_ID', ts: 'TIMESTAMP' ] })
    slackNotifications.sendFailedBuild(isFinal: false)
    slackNotifications.sendFailedBuild(isFinal: true)

    def args = fnMocks('slackSend')[1].args[0]

    def expected = [
      channel: 'CHANNEL_ID',
      timestamp: 'TIMESTAMP',
      username: 'Kibana Operations',
      iconEmoji: ':jenkins:',
      color: 'danger',
      message: ':broken_heart: elastic / kibana # master #1',
    ]

    expected.each {
      assertEquals(it.value.toString(), args[it.key].toString())
    }
  }

  @Test
  void 'getTestFailures() should truncate list of failures to 10'() {
    prop('testUtils', [
      getFailures: {
        return (1..12).collect {
          return [
            url: Mocks.TEST_FAILURE_URL,
            fullDisplayName: "Failure #${it}",
          ]
        }
      },
    ])

    def message = (String) slackNotifications.getTestFailures()

    assertTrue("Message ends with truncated indicator", message.endsWith("...and 2 more"))
    assertTrue("Message contains Failure #10", message.contains("Failure #10"))
    assertTrue("Message does not contain Failure #11", !message.contains("Failure #11"))
  }

  @Test
  void 'shortenMessage() should truncate a long message, but leave parts that fit'() {
    assertEquals('Hello\nHello\n[...truncated...]', slackNotifications.shortenMessage('Hello\nHello\nthis is a long string', 29))
  }

  @Test
  void 'shortenMessage() should not modify a short message'() {
    assertEquals('Hello world', slackNotifications.shortenMessage('Hello world', 11))
  }

  @Test
  void 'shortenMessage() should truncate an entire message with only one part'() {
    assertEquals('[...truncated...]', slackNotifications.shortenMessage('Hello world this is a really long message', 40))
  }
}
