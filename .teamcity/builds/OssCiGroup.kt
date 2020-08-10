import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class OssCiGroup(val ciGroup: Int, val build: BuildType) : BuildType({
    id("OssCiGroup_${ciGroup}")
    name = "CI Group ${ciGroup}"
    paused = true

    steps {
        script {
            scriptContent = """
                #!/bin/bash

                if [[ -d "/home/agent/.kibana/node_modules" ]]; then
                  echo 'Using node_modules cache'
                  mv /home/agent/.kibana/node_modules .
                fi

                export CI_PARALLEL_PROCESS_NUMBER=1
                export CI_GROUP=${ciGroup}
                export JOB=kibana-ciGroup${ciGroup}
                export CI=true
                export GCS_UPLOAD_PREFIX=ehwihsihfiashdhfshfso

                mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* /home/agent/work/kibana-build-oss/

                source ./src/dev/ci_setup/setup.sh
                ./test/scripts/jenkins_ci_group.sh
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
