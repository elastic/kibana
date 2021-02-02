package builds

import addSlackNotifications
import areTriggersEnabled
import builds.default.DefaultBuild
import builds.default.DefaultSavedObjectFieldMetrics
import builds.oss.OssBuild
import dependsOn
import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs
import templates.KibanaTemplate

object BaselineCi : BuildType({
  id("Baseline_CI")
  name = "Baseline CI"
  description = "Runs builds, saved object field metrics for every commit"
  type = Type.COMPOSITE
  paused = !areTriggersEnabled()

  templates(KibanaTemplate)

  triggers {
    vcs {
      branchFilter = "refs/heads/${getProjectBranch()}"
      perCheckinTriggering = areTriggersEnabled()
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
