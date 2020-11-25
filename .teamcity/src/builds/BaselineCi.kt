package builds

import addSlackNotifications
import builds.default.DefaultBuild
import builds.default.DefaultSavedObjectFieldMetrics
import builds.oss.OssBuild
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs
import templates.KibanaTemplate

object BaselineCi : BuildType({
  id("Baseline_CI")
  name = "Baseline CI"
  description = "Runs builds, saved object field metrics for every commit"
  type = Type.COMPOSITE
  paused = true

  templates(KibanaTemplate)

  triggers {
    vcs {
      branchFilter = "refs/heads/7.x_teamcity"
//      perCheckinTriggering = true // TODO re-enable this later, it wreaks havoc when I merge upstream
    }
  }

  dependsOn(
    OssBuild,
    DefaultBuild,
    DefaultSavedObjectFieldMetrics
  ) {
    onDependencyCancel = FailureAction.ADD_PROBLEM
  }

  addSlackNotifications()
})
