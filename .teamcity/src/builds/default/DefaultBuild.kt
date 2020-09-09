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
    +:plugins/*/target/**/* => plugins-base.tar.gz
    +:x-pack/plugins/*/target/**/* => plugins-default.tar.gz
    +:x-pack/test/*/plugins/*/target/**/* => plugins-default-test.tar.gz
    target/kibana-*
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
      +:plugins-default-test.tar.gz!** => x-pack/test/
      +:plugins-default.tar.gz!** => x-pack/plugins/
      +:plugins-base.tar.gz!** => plugins/
    """.trimIndent()
  )
}
