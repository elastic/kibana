package builds

import builds.default.*
import builds.oss.*
import builds.test.AllTests
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

object FullCi : BuildType({
  id("Full_CI")
  name = "Full CI"
  description = "Runs everything in CI. For tracked branches and PRs."
  type = Type.COMPOSITE

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
