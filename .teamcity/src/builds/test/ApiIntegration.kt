package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import runbld

object ApiIntegration : BuildType({
  name = "API Integration"
  description = "Executes API Integration Tests"

  steps {
    runbld("API Integration", "yarn run grunt run:apiIntegrationTests")
  }

  addTestSettings()
})
