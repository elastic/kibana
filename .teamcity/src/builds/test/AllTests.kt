package builds.test

import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

object AllTests : BuildType({
  name = "All Tests"
  description = "All Non-Functional Tests"
  type = Type.COMPOSITE

  dependsOn(QuickTests, Jest, XPackJest, JestIntegration, ApiServerIntegration)
})
