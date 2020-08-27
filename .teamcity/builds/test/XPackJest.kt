package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object XPackJest : BuildType({
  name = "X-Pack Jest Unit"
  paused = true
  description = "Executes X-Pack Jest Unit Tests"

  steps {
    script {
      name = "X-Pack Jest Unit"
      scriptContent = """
                #!/bin/bash
                cd x-pack
                node --max-old-space-size=6144 scripts/jest --ci --verbose
            """.trimIndent()
    }
  }
})
