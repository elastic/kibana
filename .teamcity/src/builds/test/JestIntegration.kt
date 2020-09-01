package builds.test

import addSlackNotifications
import addTestArtifacts
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object JestIntegration : BuildType({
  name = "Jest Integration"
  paused = true
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

  features {
    junit()
  }

  addTestArtifacts()
  addSlackNotifications()
})
