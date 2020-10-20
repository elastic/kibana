package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.*
import runbld

class OssCiGroup(val ciGroup: Int, init: BuildType.() -> Unit = {}) : OssFunctionalBase({
  id("OssCiGroup_$ciGroup")
  name = "CI Group $ciGroup"

  steps {
    runbld("OSS CI Group $ciGroup", "./.ci/teamcity/oss/ci_group.sh $ciGroup")
  }

  init()
})
