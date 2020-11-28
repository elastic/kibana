package templates

import vcs.Kibana
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildStep
import jetbrains.buildServer.configs.kotlin.v2019_2.ParameterDisplay
import jetbrains.buildServer.configs.kotlin.v2019_2.Template
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.PullRequests
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.perfmon
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.pullRequests
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.placeholder
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object KibanaTemplate : Template({
  name = "Kibana Template"
  description = "For builds that need to check out kibana and execute against the repo using node"

  vcs {
    root(Kibana)

    checkoutDir = "kibana"
//    checkoutDir = "/dev/shm/%system.teamcity.buildType.id%/%system.build.number%/kibana"
  }

  requirements {
    equals("system.cloud.profile_id", "kibana", "RQ_CLOUD_PROFILE_ID")
    startsWith("teamcity.agent.name", "kibana-standard-2-", "RQ_AGENT_NAME")
  }

  features {
    perfmon {  }
    pullRequests {
      vcsRootExtId = "${Kibana.id}"
      provider = github {
        authType = token {
          token = "credentialsJSON:07d22002-12de-4627-91c3-672bdb23b55b"
        }
        filterTargetBranch = "refs/heads/7.x_teamcity"
        filterAuthorRole = PullRequests.GitHubRoleFilter.MEMBER
      }
    }
  }

  failureConditions {
    executionTimeoutMin = 120
    testFailure = false
  }

  params {
    param("env.CI", "true")
    param("env.TEAMCITY_CI", "true")
    param("env.HOME", "/var/lib/jenkins") // TODO once the agent images are sorted out

    // TODO remove these
    param("env.GCS_UPLOAD_PREFIX", "INVALID_PREFIX")
    param("env.CI_PARALLEL_PROCESS_NUMBER", "1")

    param("env.TEAMCITY_URL", "%teamcity.serverUrl%")
    param("env.TEAMCITY_BUILD_URL", "%teamcity.serverUrl%/build/%teamcity.build.id%")
    param("env.TEAMCITY_JOB_ID", "%system.teamcity.buildType.id%")
    param("env.TEAMCITY_BUILD_ID", "%build.number%")
    param("env.TEAMCITY_BUILD_NUMBER", "%teamcity.build.id%")

    param("env.GIT_BRANCH", "%vcsroot.branch%")
    param("env.GIT_COMMIT", "%build.vcs.number%")
    param("env.branch_specifier", "%vcsroot.branch%")

    password("env.KIBANA_CI_STATS_CONFIG", "", display = ParameterDisplay.HIDDEN)
    password("env.CI_STATS_TOKEN", "credentialsJSON:ea975068-ca68-4da5-8189-ce90f4286bc0", display = ParameterDisplay.HIDDEN)
    password("env.CI_STATS_HOST", "credentialsJSON:933ba93e-4b06-44c1-8724-8c536651f2b6", display = ParameterDisplay.HIDDEN)

    // TODO move these to vault once the configuration is finalized
    // password("env.CI_STATS_TOKEN", "%vault:kibana-issues:secret/kibana-issues/dev/kibana_ci_stats!/api_token%", display = ParameterDisplay.HIDDEN)
    // password("env.CI_STATS_HOST", "%vault:kibana-issues:secret/kibana-issues/dev/kibana_ci_stats!/api_host%", display = ParameterDisplay.HIDDEN)

    // TODO remove this once we are able to pull it out of vault and put it closer to the things that require it
    password("env.GITHUB_TOKEN", "credentialsJSON:07d22002-12de-4627-91c3-672bdb23b55b", display = ParameterDisplay.HIDDEN)
    password("env.KIBANA_CI_REPORTER_KEY", "", display = ParameterDisplay.HIDDEN)
    password("env.KIBANA_CI_REPORTER_KEY_BASE64", "credentialsJSON:86878779-4cf7-4434-82af-5164a1b992fb", display = ParameterDisplay.HIDDEN)

  }

  steps {
    script {
      name = "Setup Environment"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/setup_env.sh
        """.trimIndent()
    }

    script {
      name = "Setup Node and Yarn"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/setup_node.sh
        """.trimIndent()
    }

    script {
      name = "Setup CI Stats"
      scriptContent =
        """
                #!/bin/bash
                node .ci/teamcity/setup_ci_stats.js
        """.trimIndent()
    }

    script {
      name = "Bootstrap"
      scriptContent =
        """
                #!/bin/bash
                ./.ci/teamcity/bootstrap.sh
        """.trimIndent()
    }

    placeholder {}

    script {
      name = "Set Build Status Success"
      scriptContent =
        """
                #!/bin/bash
                echo "##teamcity[setParameter name='env.BUILD_STATUS' value='SUCCESS']"
        """.trimIndent()
      executionMode = BuildStep.ExecutionMode.RUN_ON_SUCCESS
    }

    script {
      name = "CI Stats Complete"
      scriptContent =
        """
                #!/bin/bash
                node .ci/teamcity/ci_stats_complete.js
        """.trimIndent()
      executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
    }
  }
})
