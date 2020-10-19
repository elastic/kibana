package builds.oss

import addTestSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.*

open class OssFunctionalBase(init: BuildType.() -> Unit = {}) : BuildType({
  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

  dependencies {
    ossBuild()
  }

  init()

  addTestSettings()
})
