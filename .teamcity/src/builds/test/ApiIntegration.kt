package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object ApiIntegration : BuildType({
  name = "API Integration"
  description = "Executes API Integration Tests"

  steps {
    script {
      name = "API Integration"
      scriptContent =
        """
                #!/bin/bash
                yarn run grunt run:apiIntegrationTests
        """.trimIndent()
    }
  }

  addTestSettings()
})
