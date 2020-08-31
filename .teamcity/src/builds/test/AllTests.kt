package builds.test

import Junit
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildTypeSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.ReuseBuilds
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object AllTests : BuildType({

  name = "All Tests"
  paused = true
  description = "All Non-Functional Tests"
  type = Type.COMPOSITE

  dependencies {
    val builds = listOf(Jest, XPackJest, JestIntegration, ApiIntegration)

    for (build in builds) {
      snapshot(build) {
        reuseBuilds = ReuseBuilds.SUCCESSFUL
        onDependencyCancel = FailureAction.CANCEL
        onDependencyFailure = FailureAction.CANCEL
        synchronizeRevisions = true
      }
    }
  }
})
