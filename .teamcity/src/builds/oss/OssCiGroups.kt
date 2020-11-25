package builds.oss

import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

const val OSS_CI_GROUP_COUNT = 12
val ossCiGroups = (1..OSS_CI_GROUP_COUNT).map { OssCiGroup(it) }

object OssCiGroups : BuildType({
  id("OSS_CIGroups_Composite")
  name = "CI Groups"
  type = Type.COMPOSITE

  dependsOn(*ossCiGroups.toTypedArray())
})
