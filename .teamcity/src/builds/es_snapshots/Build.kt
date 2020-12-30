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
    root(Kibana, "+:. => kibana")
    root(Elasticsearch, "+:. => elasticsearch")
    checkoutDir = ""
  }

  params {
    param("env.ELASTICSEARCH_BRANCH", "%vcsroot.${Elasticsearch.id.toString()}.branch%")
    param("env.ELASTICSEARCH_GIT_COMMIT", "%build.vcs.number.${Elasticsearch.id.toString()}%")

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
      name = "Build Elasticsearch Distribution"
      scriptContent =
        """
          #!/bin/bash
          cd kibana
          ./.ci/teamcity/es_snapshots/build.sh
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
      name = "Create Snapshot Manifest"
      scriptContent =
        """#!/bin/bash
          cd kibana
          node ./.ci/teamcity/es_snapshots/create_manifest.js "$(cd ../es-build && pwd)"
        """.trimIndent()
    }
  }

  artifactRules = "+:es-build/**/*.json"

  addSlackNotifications()
})
