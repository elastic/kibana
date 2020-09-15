package builds

import addSlackNotifications
import builds.default.DefaultBuild
import builds.default.DefaultVisualRegression
import builds.oss.OssBuild
import builds.oss.OssVisualRegression
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs

object BaselineCi : BuildType({
  id("Baseline_CI")
  name = "Baseline CI"
  description = "Runs builds and visual regression tests for every commit"
  type = Type.COMPOSITE
  paused = true

  triggers {
    vcs {
//      perCheckinTriggering = true // TODO re-enable this later, it wreaks havoc when I merge upstream
    }
  }

  dependsOn(
    OssBuild,
    DefaultBuild,
    OssVisualRegression,
    DefaultVisualRegression
  )

  addSlackNotifications()
})
