package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object Jest : BuildType({
  name = "Jest Unit"
  paused = true
  description = "Executes Jest Unit Tests"

  steps {
    script {
      name = "Jest Unit"
      scriptContent = """
                #!/bin/bash
                yarn run grunt run:test_jest
            """.trimIndent()
    }
  }
})
