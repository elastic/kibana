package templates

import jetbrains.buildServer.configs.kotlin.v2019_2.Template
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.perfmon

object DefaultTemplate : Template({
  name = "Default Template"

  requirements {
    equals("system.cloud.profile_id", "kibana", "RQ_CLOUD_PROFILE_ID")
    startsWith("teamcity.agent.name", "kibana-standard-2-", "RQ_AGENT_NAME")
  }

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
