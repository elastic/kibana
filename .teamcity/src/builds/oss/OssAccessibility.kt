package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssAccessibility : OssFunctionalBase({
  id("OssAccessibility")
  name = "Accessibility"

  steps {
    script {
      name = "OSS Accessibility"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/accessibility.sh
        """.trimIndent()
    }
  }
})
