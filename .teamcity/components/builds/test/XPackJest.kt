package builds.test

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object XPackJest : BuildType({
  name = "X-Pack Jest Unit"
  paused = true
  description = "Executes X-Pack Jest Unit Tests"

  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-8-", "RQ_AGENT_NAME")
  }

  steps {
    script {
      name = "X-Pack Jest Unit"
      scriptContent = """
                #!/bin/bash
                cd x-pack
                node --max-old-space-size=6144 scripts/jest --ci --verbose
            """.trimIndent()
    }
  }

  features {
    feature {
      type = "xml-report-plugin"
      param("xmlReportParsing.reportType", "junit")
      param("xmlReportParsing.reportDirs", "target/**/TEST-*.xml")
    }
  }
})
