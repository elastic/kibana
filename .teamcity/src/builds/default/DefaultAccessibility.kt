package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultAccessibility : DefaultFunctionalBase({
  id("DefaultAccessibility")
  name = "Accessibility"

  steps {
    script {
      name = "Default Accessibility"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/accessibility.sh
        """.trimIndent()
    }
  }
})
