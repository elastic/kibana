package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class DefaultCiGroup(val ciGroup: Int = 0, init: BuildType.() -> Unit = {}) : DefaultFunctionalBase({
  id("DefaultCiGroup_$ciGroup")
  name = "CI Group $ciGroup"

  steps {
    script {
      name = "Default CI Group $ciGroup"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/ci_group.sh $ciGroup
        """.trimIndent()
    }
  }

  init()
})
