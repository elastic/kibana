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

  params {
    param("env.GOOGLE_APPLICATION_CREDENTIALS", "%teamcity.build.workingDir%/gcp-credentials.json")
    password("env.GOOGLE_APPLICATION_CREDENTIALS_JSON", "credentialsJSON:6e0acb7c-f89c-4225-84b8-4fc102f1a5ef", display = ParameterDisplay.HIDDEN)
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
      name = "Setup Google Cloud Credentials"
      scriptContent =
        """#!/bin/bash
          echo "${"$"}GOOGLE_APPLICATION_CREDENTIALS_JSON" > "${"$"}GOOGLE_APPLICATION_CREDENTIALS"
          echo "${"$"}GOOGLE_APPLICATION_CREDENTIALS_JSON" > test.json
          ls -alh
          export GOOGLE_APPLICATION_CREDENTIALS="${"$"}(pwd)/gcp-credentials.json"
          gcloud auth activate-service-account --key-file "${"$"}GOOGLE_APPLICATION_CREDENTIALS"
          gcloud info
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
