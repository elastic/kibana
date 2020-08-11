import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

class OssVisualRegression(val build: BuildType) : BuildType({
    id("OssVisualRegression")
    name = "Visual Regression"
    paused = true

    params {
      password("env.PERCY_TOKEN", "credentialsJSON:1ef0e984-a184-4f1c-a9be-282182cb262d", display = ParameterDisplay.HIDDEN)
    }

    steps {
        script {
            scriptContent = """
                #!/bin/bash

                if [[ -d "/home/agent/.kibana/node_modules" ]]; then
                  echo 'Using node_modules cache'
                  mv /home/agent/.kibana/node_modules .
                fi

                export CI_PARALLEL_PROCESS_NUMBER=1
                export JOB=oss-visualRegression
                export CI=true
                export GCS_UPLOAD_PREFIX=ehwihsihfiashdhfshfso

                mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* /home/agent/work/kibana-build-oss/

                source ./src/dev/ci_setup/setup.sh
                source ./src/dev/ci_setup/setup_percy.sh

                yarn percy exec -t 10000 -- -- node scripts/functional_tests \
                  --debug --bail \
                  --kibana-install-dir "/home/agent/work/kibana-build-oss/" \
                  --config test/visual_regression/config.ts;
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
