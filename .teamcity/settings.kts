import builds.oss.*
import builds.default.*
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import templates.DefaultTemplate

version = "2020.1"

project {
  params {
    param("teamcity.ui.settings.readOnly", "true")
  }

  vcsRoot(DefaultRoot)
  template(DefaultTemplate)

  defaultTemplate = DefaultTemplate

//        triggers {
//            vcs {
//                perCheckinTriggering = true
//            }
//        }
//    }


  features {

    feature {
      id = "KIBANA_BRIANSEEDERS"
      type = "CloudImage"
      param("subnet", "teamcity")
      param("growingId", "true")
      param("agent_pool_id", "-2")
      param("sourceProject", "elastic-kibana-184716")
//      param("source-id", "elastic-kibana-ci-ubuntu-1804-lts-")
      param("source-id", "kibana-teamcity-dev-")
      param("network", "teamcity")
      param("preemptible", "false")
//      param("sourceImageFamily", "elastic-kibana-ci-ubuntu-1804-lts")
//      param("sourceImageFamily", "kibana-teamcity-dev-agents")
      param("sourceImageFamily", "kibana-ci-elastic-dev")
      param("zone", "us-central1-a")
      param("profileId", "kibana-brianseeders")
      param("diskType", "pd-ssd")
      param("machineCustom", "false")
      param("maxInstances", "10")
      param("imageType", "ImageFamily")
      param("machineType", "n2-standard-16")
      param("diskSizeGb", "")
    }
    feature {
      id = "kibana-brianseeders"
      type = "CloudProfile"
      param("agentPushPreset", "")
      param("profileId", "kibana-brianseeders")
      param("profileServerUrl", "")
      param("name", "kibana-brianseeders")
      param("total-work-time", "")
      param("credentialsType", "key")
      param("description", "")
      param("next-hour", "")
      param("cloud-code", "google")
      param("terminate-idle-time", "30")
      param("enabled", "true")
      param("secure:accessKey", "credentialsJSON:447fdd4d-7129-46b7-9822-2e57658c7422")
    }
  }

  subProject {
    id("OSS")
    name = "OSS Distro"

    buildType(OssBuild)

    subProject {
      id("OSS_Functional")
      name = "Functional"

      val ciGroups = (1..12).map { OssCiGroup(it) }

      buildType {
        id("CIGroups_Composite")
        name = "CI Groups"
        type = BuildTypeSettings.Type.COMPOSITE

        dependencies {
          for (ciGroup in ciGroups) {
            snapshot(ciGroup) {
              reuseBuilds = ReuseBuilds.SUCCESSFUL
              onDependencyCancel = FailureAction.CANCEL
              onDependencyFailure = FailureAction.CANCEL
              synchronizeRevisions = true
            }
          }
        }
      }

      buildType(OssVisualRegression)

      subProject {
        id("CIGroups")
        name = "CI Groups"

        for (ciGroup in ciGroups) buildType(ciGroup)
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

      val ciGroups = (1..10).map { DefaultCiGroup(it) }

      buildType {
        id("Default_CIGroups_Composite")
        name = "CI Groups"
        type = BuildTypeSettings.Type.COMPOSITE

        dependencies {
          for (ciGroup in ciGroups) {
            snapshot(ciGroup) {
              reuseBuilds = ReuseBuilds.SUCCESSFUL
              onDependencyCancel = FailureAction.CANCEL
              onDependencyFailure = FailureAction.CANCEL
              synchronizeRevisions = true
            }
          }
        }
      }

      buildType(DefaultVisualRegression)

      subProject {
        id("Default_CIGroups")
        name = "CI Groups"

        for (ciGroup in ciGroups) buildType(ciGroup)
      }
    }
  }
}
