package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object Lint : BuildType({
  name = "Lint"
  description = "Executes Linting, such as eslint and stylelint"

  kibanaAgent(2)

  steps {
    script {
      name = "Stylelint"

      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/checks/stylelint.sh
        """.trimIndent()
    }

    script {
      name = "ESLint"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/checks/eslint.sh
        """.trimIndent()
    }
  }
})
