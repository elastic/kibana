package builds.oss

import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import runbld

object OssAccessibility : OssFunctionalBase({
  id("OssAccessibility")
  name = "Accessibility"

  steps {
    runbld("OSS Accessibility", "./.ci/teamcity/oss/accessibility.sh")
  }
})
