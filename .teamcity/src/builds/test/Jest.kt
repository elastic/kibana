package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import kibanaAgent
import runbld

object Jest : BuildType({
  name = "Jest Unit"
  description = "Executes Jest Unit Tests"

  kibanaAgent(8)

  steps {
    runbld("Jest Unit", "yarn run grunt run:test_jest")
  }

  addTestSettings()
})
