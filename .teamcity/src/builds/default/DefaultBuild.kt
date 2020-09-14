package builds.default

import addSlackNotifications
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.Dependencies
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object DefaultBuild : BuildType({
  name = "Build Default"
  paused = true
  description = "Generates Default Build Distribution artifact"

  artifactRules = """
    +:install/kibana/**/* => kibana-default.tar.gz
    target/kibana-*
    +:src/**/public/target/**/* => kibana-default-plugins.tar.gz!/src/
    +:x-pack/plugins/**/public/target/**/* => kibana-default-plugins.tar.gz!/x-pack/plugins/
    +:x-pack/test/**/public/target/**/* => kibana-default-plugins.tar.gz!/x-pack/test/
    +:examples/**/public/target/**/* => kibana-default-plugins.tar.gz!/examples/
    +:test/**/public/target/**/* => kibana-default-plugins.tar.gz!/test/
  """.trimIndent()

  kibanaAgent(16)

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

  addSlackNotifications()
})

fun Dependencies.defaultBuild(rules: String = "+:kibana-default.tar.gz!** => build/kibana-build-default") {
  dependency(DefaultBuild) {
    snapshot {
    }

    artifacts {
      artifactRules = rules
    }
  }
}

fun Dependencies.defaultBuildWithPlugins() {
  defaultBuild("""
    +:kibana-default.tar.gz!** => build/kibana-build-default
    +:kibana-default-plugins.tar.gz!**
  """.trimIndent())
}
