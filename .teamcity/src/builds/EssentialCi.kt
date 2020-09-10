package builds

import builds.default.DefaultBuild
import builds.default.DefaultCiGroups
import builds.default.DefaultFirefox
import builds.default.DefaultVisualRegression
import builds.oss.OssBuild
import builds.oss.OssCiGroups
import builds.oss.OssFirefox
import builds.oss.OssVisualRegression
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
    AllTests,
    OssBuild,
    DefaultBuild,
    OssVisualRegression,
    DefaultVisualRegression,
    Lint,
    OssCiGroups,
    DefaultCiGroups,
    OssFirefox,
    DefaultFirefox
  )
})
