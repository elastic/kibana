import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.placeholder
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class OssVisualRegression(val build: BuildType) : BuildType({
  id("OssVisualRegression")
  name = "Visual Regression"
  paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
    password("env.PERCY_TOKEN", "credentialsJSON:1ef0e984-a184-4f1c-a9be-282182cb262d", display = ParameterDisplay.HIDDEN)
  }

  steps {
    script {
      name = "OSS Visual Regression"
      scriptContent = """
              #!/bin/bash
              ./.ci/teamcity/oss/visual_regression.sh
          """.trimIndent()
    }
  }

  features {
    feature {
      type = "xml-report-plugin"
      param("xmlReportParsing.reportType", "junit")
      param("xmlReportParsing.reportDirs", "target/**/TEST-*.xml")
    }
  }

  dependencies {
    dependency(build) {
      snapshot {
      }

      artifacts {
        artifactRules = "+:kibana-oss.tar.gz!** => /home/agent/work/kibana-build-oss"
      }
    }
  }
})
