package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import runbld

object ApiServerIntegration : BuildType({
  name = "API/Server Integration"
  description = "Executes API and Server Integration Tests"

  steps {
    runbld("API Integration", "yarn run grunt run:apiIntegrationTests")
    runbld("Server Integration", "yarn run grunt run:serverIntegrationTests")
  }

  addTestSettings()
})
