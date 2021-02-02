package builds.default

import StandardAgents
import addTestSettings
import co.elastic.teamcity.common.requireAgent
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

open class DefaultFunctionalBase(init: BuildType.() -> Unit = {}) : BuildType({
  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  requireAgent(StandardAgents["4"]!!)

  dependencies {
    defaultBuildWithPlugins()
  }

  init()

  addTestSettings()
})

