import com.lesfurets.jenkins.unit.*
import org.junit.Before

class KibanaBasePipelineTest extends BasePipelineTest {
  Map env = [:]
  Map params = [:]

  public def Mocks = [
    TEST_FAILURE_URL: "https://localhost/",
    TEST_FAILURE_NAME_SHORT: "x-pack/test/functional/apps/fake/test·ts.Fake test should pass",
    TEST_FAILURE_NAME: "Kibana Pipeline / kibana-xpack-agent / Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/fake/test·ts.Fake test should pass",
  ]

  @Before
  void setUp() {
    super.setUp()

    env.BRANCH_NAME = 'master'
    env.BUILD_ID = '1'
    env.BUILD_DISPLAY_NAME = "#${env.BUILD_ID}"

    env.JENKINS_URL = 'http://jenkins.localhost:8080/'
    env.BUILD_URL = "${env.JENKINS_URL}/job/elastic+kibana+${env.BRANCH_NAME}/${env.BUILD_ID}/"

    env.JOB_BASE_NAME = "elastic / kibana # ${env.BRANCH_NAME}"
    env.JOB_NAME = env.JOB_BASE_NAME

    env.WORKSPACE = 'WS'

    props([
      buildUtils: [ getBuildStatus: { "SUCCESS" } ],
      jenkinsApi: [ getFailedSteps: { [] } ],
      testUtils: [ getFailures: { [] } ],
    ])

    vars([
      env: env,
      params: params,
    ])

    helper.registerAllowedMethod('slackSend', [Map.class], null)
  }

  void props(Map properties) {
    properties.each {
      binding.setProperty(it.key, it.value)
    }
  }

  void prop(String propertyName, Object propertyValue) {
    binding.setProperty(propertyName, propertyValue)
  }

  void vars(Map variables) {
    variables.each {
      binding.setVariable(it.key, it.value)
    }
  }

  void var(String variableName, Object variableValue) {
    binding.setVariable(variableName, variableValue)
  }

  void mockFailureBuild() {
    props([
      buildUtils: [ getBuildStatus: { "FAILURE" } ],
      testUtils: [
        getFailures: {
          return [
            [
              url            : Mocks.TEST_FAILURE_URL,
              fullDisplayName: Mocks.TEST_FAILURE_NAME,
            ]
          ]
        },
      ],
    ])
  }
}
