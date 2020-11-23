package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object Lint : BuildType({
  name = "Lint"
  description = "Executes Linting, such as eslint and sasslint"

  kibanaAgent(2)

  steps {
    script {
      name = "Sasslint"

      scriptContent =
        """
          #!/bin/bash
          yarn run grunt run:sasslint
        """.trimIndent()
    }

    script {
      name = "ESLint"
      scriptContent =
        """
          #!/bin/bash
          yarn run grunt run:eslint
        """.trimIndent()
    }
  }
})
