package builds.test

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import kibanaAgent
import runbld

object XPackJest : BuildType({
  name = "X-Pack Jest Unit"
  description = "Executes X-Pack Jest Unit Tests"

  kibanaAgent(16)

  steps {
      runbld("X-Pack Jest Unit", """
        cd x-pack
        node --max-old-space-size=6144 scripts/jest --ci --verbose --maxWorkers=6
      """.trimIndent())
  }

  addTestSettings()
})
