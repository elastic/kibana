package builds.test

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object ApiIntegration : BuildType({
  name = "API Integration"
  paused = true
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

    failedTestReporter()
  }

  features {
    junit()
  }

  addTestArtifacts()
  addSlackNotifications()
})
