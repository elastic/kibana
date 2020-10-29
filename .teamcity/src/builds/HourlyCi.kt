package builds

import addSlackNotifications
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.schedule

object HourlyCi : BuildType({
  id("Hourly_CI")
  name = "Hourly CI"
  description = "Runs everything in CI, hourly"
  type = Type.COMPOSITE

  triggers {
    schedule {
      schedulingPolicy = cron {
        hours = "*"
        minutes = "0"
      }
      branchFilter = "refs/heads/master_teamcity"
      triggerBuild = always()
      withPendingChangesOnly = true
    }
  }

  dependsOn(
    FullCi
  ) {
    onDependencyCancel = FailureAction.ADD_PROBLEM
  }

  addSlackNotifications()
})
