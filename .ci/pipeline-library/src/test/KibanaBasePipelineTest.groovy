import com.lesfurets.jenkins.unit.*
import org.junit.Before

class KibanaBasePipelineTest extends BasePipelineTest {
  Map env = [:]
  Map params = [:]

  public def Mocks = [
    TEST_FAILURE_URL: 'https://localhost/',
    TEST_FAILURE_NAME: 'Kibana Pipeline / kibana-xpack-agent / Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/fake/test·ts.Fake test <Component> should & pass &',
  ]

  @Before
  void setUp() {
    super.setUp()

    env.BRANCH_NAME = 'master'
    env.BUILD_ID = '1'
    env.BUILD_DISPLAY_NAME = "#${env.BUILD_ID}"

    env.JENKINS_URL = 'http://jenkins.localhost:8080'
    env.BUILD_URL = "${env.JENKINS_URL}/job/elastic+kibana+${env.BRANCH_NAME}/${env.BUILD_ID}/".toString()

    env.JOB_BASE_NAME = "elastic / kibana # ${env.BRANCH_NAME}".toString()
    env.JOB_NAME = env.JOB_BASE_NAME

    env.WORKSPACE = 'WS'

    props([
      buildUtils: [
        getBuildStatus: { 'SUCCESS' },
        printStacktrace: { ex -> print ex },
      ],
      githubPr: [
        isPr: { false },
      ],
      jenkinsApi: [ getFailedSteps: { [] } ],
      testUtils: [ getFailures: { [] } ],
    ])

    vars([
      env: env,
      params: params,
    ])

    // Some wrappers that can just be mocked to immediately call the closure passed in
    [
      'catchError',
      'catchErrors',
      'timestamps',
      'withGithubCredentials',
    ].each {
      helper.registerAllowedMethod(it, [Closure.class], null)
    }
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

  def fnMock(String name) {
    return helper.callStack.find { it.methodName == name }
  }

  void mockFailureBuild() {
    props([
      buildUtils: [
        getBuildStatus: { 'FAILURE' },
        printStacktrace: { ex -> print ex },
      ],
      jenkinsApi: [ getFailedSteps: { [
        [
          displayName: 'Check out from version control',
          logs: 'http://jenkins.localhost:8080',
        ],
        [
          displayName: 'Execute test task',
          logs: 'http://jenkins.localhost:8080',
        ],
      ] } ],
      testUtils: [
        getFailures: {
          return [
            [
              url: Mocks.TEST_FAILURE_URL,
              fullDisplayName: Mocks.TEST_FAILURE_NAME,
            ]
          ]
        },
      ],
    ])
  }
}
