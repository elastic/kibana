package builds.oss

import runbld

object OssApiServerIntegration : OssFunctionalBase({
  name = "API/Server Integration"
  description = "Executes API and Server Integration Tests"

  steps {
    runbld("API Integration", "./.ci/teamcity/oss/api_integration.sh")
    runbld("Server Integration", "./.ci/teamcity/oss/server_integration.sh")
  }
})
