package builds.oss

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object OssFirefox : BuildType({
  id("OssFirefox")
  name = "Firefox"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  steps {
    script {
      name = "OSS Firefox"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/firefox.sh
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
