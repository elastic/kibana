package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssFirefox : OssFunctionalBase({
  id("OssFirefox")
  name = "Firefox"

  steps {
    script {
      name = "OSS Firefox"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/firefox.sh
        """.trimIndent()
    }
  }
})
