package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssBuild : BuildType({
  name = "Build OSS"
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
})

fun Dependencies.ossBuild(rules: String = "+:kibana-oss.tar.gz!** => ../build/kibana-build-oss") {
  dependency(OssBuild) {
    snapshot {
      onDependencyFailure = FailureAction.FAIL_TO_START
      onDependencyCancel = FailureAction.FAIL_TO_START
    }

    artifacts {
      artifactRules = rules
    }
  }
}
