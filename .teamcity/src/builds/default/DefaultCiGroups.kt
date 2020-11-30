package builds.default

import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

const val DEFAULT_CI_GROUP_COUNT = 10
val defaultCiGroups = (1..DEFAULT_CI_GROUP_COUNT).map { DefaultCiGroup(it) }

object DefaultCiGroups : BuildType({
  id("Default_CIGroups_Composite")
  name = "CI Groups"
  type = Type.COMPOSITE

  dependsOn(*defaultCiGroups.toTypedArray())
})
