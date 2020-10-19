package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object JestIntegration : BuildType({
  name = "Jest Integration"
  description = "Executes Jest Integration Tests"

  steps {
    script {
      name = "Jest Integration"
      scriptContent =
        """
                #!/bin/bash
                yarn run grunt run:test_jest_integration
        """.trimIndent()
    }
  }

  addTestSettings()
})
