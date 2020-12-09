package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import runbld

object ApiServerIntegration : BuildType({
  name = "API/Server Integration"
  description = "Executes API and Server Integration Tests"

  steps {
    runbld("API Integration", "./.ci/teamcity/oss/api_integration.sh")
    runbld("Server Integration", "./.ci/teamcity/oss/server_integration.sh")
  }

  addTestSettings()
})
