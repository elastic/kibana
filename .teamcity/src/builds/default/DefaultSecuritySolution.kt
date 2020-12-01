package builds.default

import addTestSettings
import runbld

object DefaultSecuritySolution : DefaultFunctionalBase({
  id("DefaultSecuritySolution")
  name = "Security Solution"

  steps {
    runbld("Default Security Solution", "./.ci/teamcity/default/security_solution.sh")
  }

  addTestSettings()
})
