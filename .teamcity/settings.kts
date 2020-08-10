import builds.*
//import builds.OssChecks
//import builds.SanityCheck
//import builds.XpackChecks
import jetbrains.buildServer.configs.kotlin.v2019_2.*
//import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.notifications
//import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs
import templates.DefaultTemplate

version = "2020.1"

project {
  vcsRoot(DefaultRoot)
  template(DefaultTemplate)

  defaultTemplate = DefaultTemplate

//    buildType {
//        id("Intake")
//        name = "Intake"
//        type = BuildTypeSettings.Type.COMPOSITE
//
//        dependsOn(OssChecks, XpackChecks, BwcChecks) {
//            onDependencyFailure = FailureAction.ADD_PROBLEM
//            onDependencyCancel = FailureAction.ADD_PROBLEM
//        }
//
//        triggers {
//            vcs {
//                perCheckinTriggering = true
//            }
//        }
//    }

  subProject {
    id("OSS")
    name = "OSS Distro"

    buildType(OssBuild)

    subProject {
      id("OSS_Functional")
      name = "Functional"

      val ciGroups = (1..12).map { OssCiGroup(it, OssBuild) }

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


      subProject {
        id("CIGroups")
        name = "CI Groups"

        for (ciGroup in ciGroups) buildType(ciGroup)
      }
    }
  }
}
