package builds.es_snapshots

import addSlackNotifications
import builds.default.DefaultBuild
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import vcs.Elasticsearch
import vcs.Kibana

object ESSnapshotManifest : BuildType({
  name = "Snapshot Manifest"
  paused = true

  vcs {
    root(Kibana, "+:. => kibana")
    checkoutDir = ""
  }

  steps {
    script {
      name = "Setup Environment"
      scriptContent =
        """
                #!/bin/bash
                cd kibana
                ./.ci/teamcity/setup_env.sh
        """.trimIndent()
    }

    script {
      name = "Setup Node and Yarn"
      scriptContent =
        """
                #!/bin/bash
                cd kibana
                ./.ci/teamcity/setup_node.sh
        """.trimIndent()
    }

    script {
      name = "Create Snapshot Manifest"
      scriptContent =
        """#!/bin/bash
          cd kibana
          node ./.ci/teamcity/es_snapshots/create_manifest.js "$(cd ../es-build && pwd)"
        """.trimIndent()
    }
  }

  dependencies{
    dependency(ESSnapshotBuild) {
      snapshot {
        onDependencyFailure = FailureAction.IGNORE
      }

      artifacts {
        artifactRules = "+:manifest.json => es-build/"
      }
    }
  }
})
