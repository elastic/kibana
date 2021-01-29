package projects

import vcs.Kibana
import builds.*
import builds.default.*
import builds.oss.*
import builds.test.*
import CloudProfile
import co.elastic.teamcity.common.googleCloudProfile
import isHourlyOnlyBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.projectFeatures.slackConnection
import templates.KibanaTemplate
import templates.DefaultTemplate
import vcs.Elasticsearch

class KibanaConfiguration() {
  var agentNetwork: String = "teamcity"
  var agentSubnet: String = "teamcity"

  constructor(init: KibanaConfiguration.() -> Unit) : this() {
    init()
  }
}

var kibanaConfiguration = KibanaConfiguration()

fun Kibana(config: KibanaConfiguration = KibanaConfiguration()) : Project {
  kibanaConfiguration = config

  return Project {
    params {
      param("teamcity.ui.settings.readOnly", "true")

      // https://github.com/JetBrains/teamcity-webhooks
      param("teamcity.internal.webhooks.enable", "true")
      param("teamcity.internal.webhooks.events", "BUILD_STARTED;BUILD_FINISHED;BUILD_INTERRUPTED;CHANGES_LOADED;BUILD_TYPE_ADDED_TO_QUEUE;BUILD_PROBLEMS_CHANGED")
      param("teamcity.internal.webhooks.url", "https://ci-stats.kibana.dev/_teamcity_webhook")
      param("teamcity.internal.webhooks.username", "automation")
      password("teamcity.internal.webhooks.password", "credentialsJSON:b2ee34c5-fc89-4596-9b47-ecdeb68e4e7a", display = ParameterDisplay.HIDDEN)
    }

    vcsRoot(Kibana)
    vcsRoot(Elasticsearch)

    template(DefaultTemplate)
    template(KibanaTemplate)

    defaultTemplate = DefaultTemplate

    googleCloudProfile(CloudProfile)

    features {
      slackConnection {
        id = "KIBANA_SLACK"
        displayName = "Kibana Slack"
        botToken = "credentialsJSON:39eafcfc-97a6-4877-82c1-115f1f10d14b"
        clientId = "12985172978.1291178427153"
        clientSecret = "credentialsJSON:8b5901fb-fd2c-4e45-8aff-fdd86dc68f67"
      }
    }

    subProject {
      id("CI")
      name = "CI"
      defaultTemplate = KibanaTemplate

      buildType(Lint)
      buildType(Checks)

      subProject {
        id("Test")
        name = "Test"

        subProject {
          id("Jest")
          name = "Jest"

          buildType(Jest)
          buildType(XPackJest)
          buildType(JestIntegration)
        }

        buildType(QuickTests)
        buildType(AllTests)
      }

      subProject {
        id("OSS")
        name = "OSS Distro"

        buildType(OssBuild)

        subProject {
          id("OSS_Functional")
          name = "Functional"

          buildType(OssCiGroups)
          buildType(OssFirefox)
          buildType(OssAccessibility)
          buildType(OssPluginFunctional)
          buildType(OssApiServerIntegration)

          subProject {
            id("CIGroups")
            name = "CI Groups"

            ossCiGroups.forEach { buildType(it) }
          }
        }
      }

      subProject {
        id("Default")
        name = "Default Distro"

        buildType(DefaultBuild)

        subProject {
          id("Default_Functional")
          name = "Functional"

          buildType(DefaultCiGroups)
          buildType(DefaultFirefox)
          buildType(DefaultAccessibility)
          buildType(DefaultSecuritySolution)
          buildType(DefaultSavedObjectFieldMetrics)

          subProject {
            id("Default_CIGroups")
            name = "CI Groups"

            defaultCiGroups.forEach { buildType(it) }
          }
        }
      }

      buildType(FullCi)
      buildType(BaselineCi)

      // master and 7.x get committed to so often, we only want to run full CI for them hourly
      // but for other branches, we can run daily and on merge
      if (isHourlyOnlyBranch()) {
        buildType(HourlyCi)
      } else {
        buildType(DailyCi)
        buildType(OnMergeCi)
      }

      buildType(PullRequestCi)
    }

    subProject(EsSnapshotsProject)
  }
}
