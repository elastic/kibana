package builds.oss

import addSlackNotifications
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object OssBuild : BuildType({
  name = "Build OSS"
  paused = true
  description = "Generates OSS Build Distribution artifact"

  requirements {
    startsWith("teamcity.agent.name", "kibana-c2-16-", "RQ_AGENT_NAME")
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

  artifactRules = "+:build/oss/kibana-build-oss/**/* => kibana-oss.tar.gz"

  addSlackNotifications()
})

fun Dependencies.ossBuild(rules: String = "+:kibana-oss.tar.gz!** => build/kibana-build-oss") {
  dependency(OssBuild) {
    snapshot {
    }

    artifacts {
      artifactRules = rules
    }
  }
}
