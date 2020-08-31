package builds.oss

import Junit
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssVisualRegression : BuildType({
  id("OssVisualRegression")
  name = "Visual Regression"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
    password("env.PERCY_TOKEN", "credentialsJSON:a1e37d40-830c-4ab6-a047-226688d2d81a", display = ParameterDisplay.HIDDEN)
  }

  steps {
    script {
      name = "OSS Visual Regression"
      scriptContent =
        """
              #!/bin/bash
              ./.ci/teamcity/oss/visual_regression.sh
        """.trimIndent()
    }
  }

  features {
    Junit()
  }

  dependencies {
    OssBuild()
  }
})
