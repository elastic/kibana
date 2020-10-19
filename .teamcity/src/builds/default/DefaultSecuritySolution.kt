package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultSecuritySolution : DefaultFunctionalBase({
  id("DefaultSecuritySolution")
  name = "Security Solution"

  steps {
    script {
      name = "Default Security Solution"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/security_solution.sh
        """.trimIndent()
    }
  }
})
