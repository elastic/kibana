package builds.default

import StandardAgents
import co.elastic.teamcity.common.requireAgent
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import runbld

class DefaultCiGroup(val ciGroup: Int = 0, init: BuildType.() -> Unit = {}) : DefaultFunctionalBase({
  id("DefaultCiGroup_$ciGroup")
  name = "CI Group $ciGroup"

  steps {
    runbld("Default CI Group $ciGroup", "./.ci/teamcity/default/ci_group.sh $ciGroup")
  }

  requireAgent(StandardAgents["4"]!!)

  init()
})
