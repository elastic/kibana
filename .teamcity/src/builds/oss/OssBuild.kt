package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssBuild : BuildType({
  name = "Build"
  paused = true
  description = "Generates OSS Build Distribution artifact"

  artifactRules = "+:build/oss/kibana-build-oss/**/* => kibana-oss.tar.gz"

  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-16-", "RQ_AGENT_NAME")
  }

  steps {
    script {
      name = "Build OSS Distribution"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/oss/build.sh
        """.trimIndent()
    }
  }
})

fun Dependencies.OssBuild(rules: String = "+:kibana-oss.tar.gz!** => build/kibana-build-oss") {
  dependency(OssBuild) {
    snapshot {
    }

    artifacts {
      artifactRules = rules
    }
  }
}
