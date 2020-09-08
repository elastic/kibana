package builds

import builds.default.DefaultVisualRegression
import builds.default.defaultCiGroups
import builds.oss.OssVisualRegression
import builds.oss.ossCiGroups
import builds.test.AllTests
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

object EssentialCi : BuildType({
  id("Essential_CI")
  name = "Essential CI"
  type = Type.COMPOSITE

  val builds = listOf(
    AllTests,
    OssVisualRegression,
    DefaultVisualRegression,
    Lint,
    *ossCiGroups.toTypedArray(),
    *defaultCiGroups.toTypedArray()
  )

  dependsOn(*builds.toTypedArray())
})
