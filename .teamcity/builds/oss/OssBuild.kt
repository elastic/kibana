package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssBuild : BuildType({
  name = "Build"
  paused = true
  description = "Generates OSS Build Distribution artifact"

  artifactRules = "+:build/oss/kibana-*-SNAPSHOT-linux-x86_64/**/* => kibana-oss.tar.gz"

  steps {
    script {
      name = "Build OSS Distribution"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/oss/build.sh
            """.trimIndent()
    }
  }
})
