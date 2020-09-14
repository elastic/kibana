package builds.oss

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object OssPluginFunctional : BuildType({
  id("OssPluginFunctional")
  name = "Plugin Functional"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  steps {
    script {
      name = "Build OSS Plugins"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/oss/build_plugins.sh
        """.trimIndent()
    }

    script {
      name = "OSS Plugin Functional"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/plugin_functional.sh
        """.trimIndent()
    }

    failedTestReporter()
  }

  features {
    junit()
  }

  dependencies {
    ossBuild()
  }

  addTestArtifacts()
  addSlackNotifications()
})
