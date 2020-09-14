package builds.oss

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object OssAccessibility : BuildType({
  id("OssAccessibility")
  name = "Accessibility"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  steps {
    script {
      name = "OSS Accessibility"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/accessibility.sh
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
