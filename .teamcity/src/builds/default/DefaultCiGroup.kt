package builds.default

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.notifications
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

class DefaultCiGroup(val ciGroup: Int) : BuildType({
  id("DefaultCiGroup_$ciGroup")
  name = "CI Group $ciGroup"
  paused = true

  steps {
//    script {
//      name = "Build OSS Plugins"
//      scriptContent =
//        """
//                #!/bin/bash
//                ./.ci/teamcity/oss/build_plugins.sh
//        """.trimIndent()
//    }
//
//    // TODO is there a way to re-use what was built in the DefaultBuild job?
//    script {
//      name = "Build Default Plugins"
//      scriptContent =
//        """
//                #!/bin/bash
//                ./.ci/teamcity/default/build_plugins.sh
//        """.trimIndent()
//    }

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
})
