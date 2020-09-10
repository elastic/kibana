package builds.default

import addSlackNotifications
import addTestArtifacts
import failedTestReporter
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.notifications
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import junit

object DefaultFirefox : BuildType({
  id("DefaultFirefox")
  name = "Firefox"
  paused = true

  steps {
    script {
      name = "Build OSS Plugins"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/oss/build_plugins.sh
        """.trimIndent()
    }

    // TODO is there a way to re-use what was built in the DefaultBuild job?
    script {
      name = "Build Default Plugins"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/build_plugins.sh
        """.trimIndent()
    }

    script {
      name = "Default Firefox"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/default/firefox.sh
        """.trimIndent()
    }

    failedTestReporter()
  }

  features {
    junit()
  }

  dependencies {
    defaultBuild()
  }

  addTestArtifacts()
  addSlackNotifications()
})
