package builds

import builds.default.*
import builds.oss.*
import builds.test.AllTests
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.schedule

object EssentialCi : BuildType({
  id("Essential_CI")
  name = "Essential CI"
  type = Type.COMPOSITE
  paused = false

  triggers {
    schedule {
      schedulingPolicy = cron {
        hours = "*"
        minutes = "0"
      }
      triggerBuild = always()
      withPendingChangesOnly = true
    }
  }

  dependsOn(
    Lint,
    AllTests,
    OssBuild,
    OssVisualRegression,
    OssAccessibility,
    OssPluginFunctional,
    OssCiGroups,
    OssFirefox,
    DefaultBuild,
    DefaultVisualRegression,
    DefaultCiGroups,
    DefaultFirefox,
    DefaultAccessibility
  )
})
