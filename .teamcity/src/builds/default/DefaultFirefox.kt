package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultFirefox : DefaultFunctionalBase({
  id("DefaultFirefox")
  name = "Firefox"

  steps {
    script {
      name = "Default Firefox"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/firefox.sh
        """.trimIndent()
    }
  }
})
