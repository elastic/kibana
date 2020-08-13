import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class OssCiGroup(val ciGroup: Int, val build: BuildType) : BuildType({
    id("OssCiGroup_${ciGroup}")
    name = "CI Group ${ciGroup}"
    paused = true

  params {
    param("env.KBN_NP_PLUGINS_BUILT", "true")
  }

    steps {
        script {
            scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/oss/ci_group.sh ${ciGroup}
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
