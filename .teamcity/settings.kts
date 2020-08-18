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

  subProject {
    id("OSS")
    name = "OSS Distro"

    sequential {
      buildType(OssBuild)
      parallel (options = {
        onDependencyFailure = FailureAction.CANCEL
        onDependencyCancel = FailureAction.CANCEL
        synchronizeRevisions = true
        reuseBuilds = ReuseBuilds.SUCCESSFUL
      }) {
        (1..12).forEach { buildType(OssCiGroup(it)) }
        buildType(OssVisualRegression)
      }
    }

//    buildType(OssBuild)
//
//    subProject {
//      id("OSS_Functional")
//      name = "Functional"
//
//      val ciGroups = (1..12).map { OssCiGroup(it) }
//
//      buildType {
//        id("CIGroups_Composite")
//        name = "CI Groups"
//        type = BuildTypeSettings.Type.COMPOSITE
//
//        dependencies {
//          for (ciGroup in ciGroups) {
//            snapshot(ciGroup) {
//              reuseBuilds = ReuseBuilds.SUCCESSFUL
//              onDependencyCancel = FailureAction.CANCEL
//              onDependencyFailure = FailureAction.CANCEL
//              synchronizeRevisions = true
//            }
//          }
//        }
//      }
//
//      buildType(OssVisualRegression)
//
//      subProject {
//        id("CIGroups")
//        name = "CI Groups"
//
//        for (ciGroup in ciGroups) buildType(ciGroup)
//      }
//    }
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
