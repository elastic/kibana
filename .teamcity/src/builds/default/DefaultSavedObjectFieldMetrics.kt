package builds.default

import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultSavedObjectFieldMetrics : BuildType({
  id("DefaultSavedObjectFieldMetrics")
  name = "Default Saved Object Field Metrics"

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  steps {
    script {
      name = "Default Saved Object Field Metrics"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/default/saved_object_field_metrics.sh
        """.trimIndent()
    }
  }

  dependencies {
    defaultBuild()
  }
})
