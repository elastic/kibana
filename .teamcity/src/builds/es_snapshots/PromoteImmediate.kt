package builds.es_snapshots

import addSlackNotifications
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.finishBuildTrigger
import vcs.Elasticsearch
import vcs.Kibana

object ESSnapshotPromoteImmediate : BuildType({
  name = "Immediately Promote Snapshot"
  description = "Skip testing and immediately promote the selected snapshot"
  paused = true
  type = Type.DEPLOYMENT

  vcs {
    root(Kibana, "+:. => kibana")
    checkoutDir = ""
  }

  params {
    param("env.ES_SNAPSHOT_MANIFEST", "${ESSnapshotBuild.depParamRefs["env.ES_SNAPSHOT_MANIFEST"]}")
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
          gcloud auth activate-service-account --key-file "${"$"}GOOGLE_APPLICATION_CREDENTIALS"
        """.trimIndent()
    }

    script {
      name = "Promote Snapshot Manifest"
      scriptContent =
        """#!/bin/bash
          cd kibana
          node ./.ci/teamcity/es_snapshots/promote_manifest.js "${"$"}ES_SNAPSHOT_MANIFEST"
        """.trimIndent()
    }
  }

  dependencies {
    dependency(ESSnapshotBuild) {
      snapshot {  }

      // This is just here to allow build selection in the UI, the file isn't actually used
      artifacts {
        artifactRules = "manifest.json"
      }
    }
  }

  addSlackNotifications()
})
