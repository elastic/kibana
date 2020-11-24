package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import kibanaAgent
import runbld

object QuickTests : BuildType({
  name = "Quick Tests"
  description = "Executes Quick Tests"

  kibanaAgent(2)

  val testScripts = mapOf(
    "Test Hardening" to ".ci/teamcity/tests/test_hardening.sh",
    "X-Pack List cyclic dependency" to ".ci/teamcity/tests/xpack_list_cyclic_dependency.sh",
    "X-Pack SIEM cyclic dependency" to ".ci/teamcity/tests/xpack_siem_cyclic_dependency.sh",
    "Test Projects" to ".ci/teamcity/tests/test_projects.sh",
    "Mocha Tests" to ".ci/teamcity/tests/mocha.sh"
  )

  steps {
    for (testScript in testScripts) {
      runbld(testScript.key, testScript.value)
    }
  }

  addTestSettings()
})
