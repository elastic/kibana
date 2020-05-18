import org.junit.*
import com.lesfurets.jenkins.unit.*
import static groovy.test.GroovyAssert.*

class SlackNotificationsTest extends BasePipelineTest {
    def slackNotifications

    def TEST_FAILURE_URL = "https://localhost/"
    def TEST_FAILURE_NAME = "x-pack/test/functional/apps/fake/test·ts.Fake test should pass"
    def TEST_FAILURE_NAME_FULL = "Kibana Pipeline / kibana-xpack-agent / Chrome X-Pack UI Functional Tests.${TEST_FAILURE_NAME}"

    @Before
    void setUp() {
        super.setUp()

        binding.setProperty('testUtils', [
          getFailures: {
            return [
              [
                url: TEST_FAILURE_URL,
                fullDisplayName: TEST_FAILURE_NAME_FULL,
              ]
            ]
          }
        ])

        slackNotifications = loadScript("vars/slackNotifications.groovy")
    }

    @Test
    void testCall() {
      def failureMessage = slackNotifications.getTestFailures()
      
      assertEquals(
        "*Test Failures*\n• <${TEST_FAILURE_URL}|${TEST_FAILURE_NAME}>",
        failureMessage
      )

        // call slackNotifications and check result
        // def result = slackNotifications(text: "a_B-c.1")
        // println "test"
        // assertEquals "true:", true, true
    }
}
