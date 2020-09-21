package builds.es_snapshots

import addSlackNotifications
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import vcs.Elasticsearch

object ESSnapshotBuild : BuildType({
  name = "Build Elasticsearch Snapshot"
  paused = true

  requirements {
    startsWith("teamcity.agent.name", "kibana-c2-16-", "RQ_AGENT_NAME")
  }

  vcs {
    root(Elasticsearch)

    checkoutDir = "elasticsearch"
//    checkoutDir = "/dev/shm/%system.teamcity.buildType.id%/%system.build.number%/kibana"
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
