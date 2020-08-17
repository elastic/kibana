package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultBuild : BuildType({
  name = "Build"
  paused = true
  description = "Generates Default Build Distribution artifact"

  artifactRules = "+:install/kibana/**/* => kibana-default.tar.gz"

  steps {
    script {
      name = "Build Default Distribution"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/default/build.sh
            """.trimIndent()
    }
  }
})
