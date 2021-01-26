package builds

import addSlackNotifications
import areTriggersEnabled
import dependsOn
import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs

object OnMergeCi : BuildType({
  id("OnMerge_CI")
  name = "On Merge CI"
  description = "Runs everything in CI, on each commit"
  type = Type.COMPOSITE
  paused = !areTriggersEnabled()

  maxRunningBuilds = 1

  triggers {
    vcs {
      perCheckinTriggering = false
      branchFilter = "refs/heads/${getProjectBranch()}"
    }
  }

  dependsOn(
    FullCi
  ) {
    onDependencyCancel = FailureAction.ADD_PROBLEM
  }

  addSlackNotifications()
})
