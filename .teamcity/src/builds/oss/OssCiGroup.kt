package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class OssCiGroup(val ciGroup: Int, init: BuildType.() -> Unit = {}) : OssFunctionalBase({
  id("OssCiGroup_$ciGroup")
  name = "CI Group $ciGroup"

  steps {
    script {
      name = "OSS CI Group $ciGroup"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/oss/ci_group.sh $ciGroup
        """.trimIndent()
    }
  }

  init()
})
