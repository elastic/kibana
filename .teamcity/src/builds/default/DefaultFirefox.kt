package builds.default

import runbld

object DefaultFirefox : DefaultFunctionalBase({
  id("DefaultFirefox")
  name = "Firefox"

  steps {
    runbld("Default Firefox", "./.ci/teamcity/default/firefox.sh")
  }
})
