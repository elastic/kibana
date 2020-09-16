package builds.default

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.notifications
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

open class DefaultCiGroup(val ciGroup: Int, init: BuildType.() -> Unit = {}) : BuildType({
  id("DefaultCiGroup_$ciGroup")
  name = "CI Group $ciGroup"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  steps {
    script {
      name = "Default CI Group $ciGroup"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/ci_group.sh $ciGroup
        """.trimIndent()
    }

    failedTestReporter()
  }

  features {
    junit()
  }

  dependencies {
    defaultBuildWithPlugins()
  }

  addTestArtifacts()
  addSlackNotifications()

  init()
})
