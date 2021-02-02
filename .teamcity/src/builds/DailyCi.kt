package builds

import addSlackNotifications
import areTriggersEnabled
import dependsOn
import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.schedule

object DailyCi : BuildType({
  id("Daily_CI")
  name = "Daily CI"
  description = "Runs everything in CI, daily"
  type = Type.COMPOSITE
  paused = !areTriggersEnabled()

  triggers {
    schedule {
      schedulingPolicy = cron {
        hours = "0"
        minutes = "0"
      }
      branchFilter = "refs/heads/${getProjectBranch()}"
      triggerBuild = always()
      withPendingChangesOnly = false
    }
  }

  dependsOn(
    FullCi
  ) {
    onDependencyCancel = FailureAction.ADD_PROBLEM
  }

  addSlackNotifications()
})
