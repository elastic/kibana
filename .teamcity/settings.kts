import builds.oss.OssBuild
import builds.default.DefaultBuild
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

      buildType(OssVisualRegression(OssBuild))

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

       val ciGroups = (1..10).map { DefaultCiGroup(it, DefaultBuild) }

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

      buildType(DefaultVisualRegression(DefaultBuild))

       subProject {
         id("CIGroups")
         name = "CI Groups"

         for (ciGroup in ciGroups) buildType(ciGroup)
       }
    }
  }
}
