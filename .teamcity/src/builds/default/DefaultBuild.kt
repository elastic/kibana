package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultBuild : BuildType({
  name = "Build"
  paused = true
  description = "Generates Default Build Distribution artifact"

  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-16-", "RQ_AGENT_NAME")
  }

  artifactRules = "+:install/kibana/**/* => kibana-default.tar.gz"

  steps {
    script {
      name = "Build Default Distribution"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/build.sh
        """.trimIndent()
    }
  }
})

fun Dependencies.DefaultBuild(rules: String = "+:kibana-default.tar.gz!** => build/kibana-build-default") {
  dependency(DefaultBuild) {
    snapshot {
    }

    artifacts {
      artifactRules = rules
    }
  }
}
