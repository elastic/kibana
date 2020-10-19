package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultBuild : BuildType({
  name = "Build Default"
  description = "Generates Default Build Distribution artifact"

  artifactRules = """
    +:install/kibana/**/* => kibana-default.tar.gz
    target/kibana-*
    +:src/**/target/public/**/* => kibana-default-plugins.tar.gz!/src/
    +:x-pack/plugins/**/target/public/**/* => kibana-default-plugins.tar.gz!/x-pack/plugins/
    +:x-pack/test/**/target/public/**/* => kibana-default-plugins.tar.gz!/x-pack/test/
    +:examples/**/target/public/**/* => kibana-default-plugins.tar.gz!/examples/
    +:test/**/target/public/**/* => kibana-default-plugins.tar.gz!/test/
  """.trimIndent()

  requirements {
    startsWith("teamcity.agent.name", "kibana-c2-16-", "RQ_AGENT_NAME")
  }

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

fun Dependencies.defaultBuild(rules: String = "+:kibana-default.tar.gz!** => ../build/kibana-build-default") {
  dependency(DefaultBuild) {
    snapshot {
      onDependencyFailure = FailureAction.FAIL_TO_START
      onDependencyCancel = FailureAction.FAIL_TO_START
    }

    artifacts {
      artifactRules = rules
    }
  }
}

fun Dependencies.defaultBuildWithPlugins() {
  defaultBuild("""
    +:kibana-default.tar.gz!** => ../build/kibana-build-default
    +:kibana-default-plugins.tar.gz!**
  """.trimIndent())
}
