package builds.oss

import runbld

object OssFirefox : OssFunctionalBase({
  id("OssFirefox")
  name = "Firefox"

  steps {
    runbld("OSS Firefox", "./.ci/teamcity/oss/firefox.sh")
  }
})
