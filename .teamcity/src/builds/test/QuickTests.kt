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
    "Test Hardening" to ".ci/teamcity/checks/test_hardening.sh",
    "Test Projects" to ".ci/teamcity/tests/test_projects.sh",
  )

  steps {
    for (testScript in testScripts) {
      runbld(testScript.key, testScript.value)
    }
  }

  addTestSettings()
})
