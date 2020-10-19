package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

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

    script {
      name = "OSS Plugin Functional"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/plugin_functional.sh
        """.trimIndent()
    }
  }

  dependencies {
    ossBuild()
  }
})
