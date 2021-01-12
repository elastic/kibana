package builds.oss

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import runbld

object OssPluginFunctional : OssFunctionalBase({
  id("OssPluginFunctional")
  name = "Plugin Functional"

  steps {
    script {
      name = "Build OSS Plugins"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/oss/build_plugins.sh
        """.trimIndent()
    }

    runbld("OSS Plugin Functional", "./.ci/teamcity/oss/plugin_functional.sh")
  }

  dependencies {
    ossBuild()
  }

  addTestSettings()
})
