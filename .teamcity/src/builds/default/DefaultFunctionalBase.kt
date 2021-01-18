package builds.default

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

open class DefaultFunctionalBase(init: BuildType.() -> Unit = {}) : BuildType({
  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  dependencies {
    defaultBuildWithPlugins()
  }

  init()

  addTestSettings()
})

