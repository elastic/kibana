package builds

import builds.default.*
import builds.oss.*
import builds.test.AllTests
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.schedule

object FullCi : BuildType({
  id("Full_CI")
  name = "Full CI"
  description = "Runs everything in CI, hourly"
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
    Checks,
    AllTests,
    OssBuild,
    OssAccessibility,
    OssPluginFunctional,
    OssCiGroups,
    OssFirefox,
    DefaultBuild,
    DefaultCiGroups,
    DefaultFirefox,
    DefaultAccessibility,
    DefaultSecuritySolution
  )
})
