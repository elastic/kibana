package builds.test

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object Jest : BuildType({
  name = "Jest Unit"
  paused = true
  description = "Executes Jest Unit Tests"

  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-8-", "RQ_AGENT_NAME")
  }

  steps {
    script {
      name = "Jest Unit"
      scriptContent = """
                #!/bin/bash
                yarn run grunt run:test_jest
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
