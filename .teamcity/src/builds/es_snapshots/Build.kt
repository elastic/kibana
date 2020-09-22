package builds.es_snapshots

import addSlackNotifications
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import vcs.Elasticsearch
import vcs.Kibana

object ESSnapshotBuild : BuildType({
  name = "Build Snapshot"
  paused = true

  requirements {
    startsWith("teamcity.agent.name", "kibana-c2-16-", "RQ_AGENT_NAME")
  }

  vcs {
    root(Kibana)
    root(Elasticsearch, "+:. => ../elasticsearch")
    checkoutDir = "kibana"
  }

  steps {
    script {
      name = "Build Elasticsearch Distribution"
      scriptContent =
        """
          #!/bin/bash
          ./.ci/teamcity/es_snapshots/build.sh
        """.trimIndent()
    }
  }

//  artifactRules = "+:build/oss/kibana-build-oss/**/* => kibana-oss.tar.gz"

  addSlackNotifications()
})
