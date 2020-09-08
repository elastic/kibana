package builds.test

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object XPackJest : BuildType({
  name = "X-Pack Jest Unit"
  paused = true
  description = "Executes X-Pack Jest Unit Tests"

  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-8-", "RQ_AGENT_NAME")
  }

  steps {
    script {
      name = "X-Pack Jest Unit"
      scriptContent =
        """
                #!/bin/bash
                cd x-pack
                node --max-old-space-size=6144 scripts/jest --ci --verbose
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
