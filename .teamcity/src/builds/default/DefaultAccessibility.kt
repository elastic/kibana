package builds.default

import runbld

object DefaultAccessibility : DefaultFunctionalBase({
  id("DefaultAccessibility")
  name = "Accessibility"

  steps {
    runbld("Default Accessibility", "./.ci/teamcity/default/accessibility.sh")
  }
})
