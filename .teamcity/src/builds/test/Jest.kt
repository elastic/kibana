package builds.test

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit
import kibanaAgent

object Jest : BuildType({
  name = "Jest Unit"
  paused = true
  description = "Executes Jest Unit Tests"

  kibanaAgent(8)

  steps {
    script {
      name = "Jest Unit"
      scriptContent =
        """
                #!/bin/bash
                yarn run grunt run:test_jest
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
