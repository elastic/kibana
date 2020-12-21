package templates

import StandardAgents
import co.elastic.teamcity.common.requireAgent
import jetbrains.buildServer.configs.kotlin.v2019_2.Template
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.perfmon

object DefaultTemplate : Template({
  name = "Default Template"

  requireAgent(StandardAgents["2"]!!)

  params {
    param("env.HOME", "/var/lib/jenkins") // TODO once the agent images are sorted out
  }

  features {
    perfmon {  }
  }

  failureConditions {
    executionTimeoutMin = 120
  }
})
