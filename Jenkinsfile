#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 120, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        githubPr.withDefaultPrComments {
          catchError {
            retryable.enable()
            parallel([
              // 'kibana-intake-agent': kibanaPipeline.legacyJobRunner('kibana-intake'),
              // 'x-pack-intake-agent': kibanaPipeline.legacyJobRunner('x-pack-intake'),
              'kibana-oss-agent': kibanaPipeline.withWorkers('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
                // 'oss-firefoxSmoke': kibanaPipeline.getPostBuildWorker('firefoxSmoke', {
                //   retryable('kibana-firefoxSmoke') {
                //     runbld('./test/scripts/jenkins_firefox_smoke.sh', 'Execute kibana-firefoxSmoke')
                //   }
                // }),
                // 'oss-ciGroup1': kibanaPipeline.getOssCiGroupWorker(1),
                // 'oss-ciGroup2': kibanaPipeline.getOssCiGroupWorker(2),
                // 'oss-ciGroup3': kibanaPipeline.getOssCiGroupWorker(3),
                // 'oss-ciGroup4': kibanaPipeline.getOssCiGroupWorker(4),
                // 'oss-ciGroup5': kibanaPipeline.getOssCiGroupWorker(5),
                'oss-ciGroup6': kibanaPipeline.getOssCiGroupWorker(6),
                // 'oss-ciGroup7': kibanaPipeline.getOssCiGroupWorker(7),
                // 'oss-ciGroup8': kibanaPipeline.getOssCiGroupWorker(8),
                // 'oss-ciGroup9': kibanaPipeline.getOssCiGroupWorker(9),
                // 'oss-ciGroup10': kibanaPipeline.getOssCiGroupWorker(10),
                // 'oss-ciGroup11': kibanaPipeline.getOssCiGroupWorker(11),
                // 'oss-ciGroup12': kibanaPipeline.getOssCiGroupWorker(12),
                // 'oss-accessibility': kibanaPipeline.getPostBuildWorker('accessibility', {
                //   retryable('kibana-accessibility') {
                //     runbld('./test/scripts/jenkins_accessibility.sh', 'Execute kibana-accessibility')
                //   }
                // }),
                // 'oss-visualRegression': kibanaPipeline.getPostBuildWorker('visualRegression', { runbld('./test/scripts/jenkins_visual_regression.sh', 'Execute kibana-visualRegression') }),
              ]),
              // 'kibana-xpack-agent': kibanaPipeline.withWorkers('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
              //   'xpack-firefoxSmoke': kibanaPipeline.getPostBuildWorker('xpack-firefoxSmoke', {
              //     retryable('xpack-firefoxSmoke') {
              //       runbld('./test/scripts/jenkins_xpack_firefox_smoke.sh', 'Execute xpack-firefoxSmoke')
              //     }
              //   }),
              //   'xpack-ciGroup1': kibanaPipeline.getXpackCiGroupWorker(1),
              //   'xpack-ciGroup2': kibanaPipeline.getXpackCiGroupWorker(2),
              //   'xpack-ciGroup3': kibanaPipeline.getXpackCiGroupWorker(3),
              //   'xpack-ciGroup4': kibanaPipeline.getXpackCiGroupWorker(4),
              //   'xpack-ciGroup5': kibanaPipeline.getXpackCiGroupWorker(5),
              //   'xpack-ciGroup6': kibanaPipeline.getXpackCiGroupWorker(6),
              //   'xpack-ciGroup7': kibanaPipeline.getXpackCiGroupWorker(7),
              //   'xpack-ciGroup8': kibanaPipeline.getXpackCiGroupWorker(8),
              //   'xpack-ciGroup9': kibanaPipeline.getXpackCiGroupWorker(9),
              //   'xpack-ciGroup10': kibanaPipeline.getXpackCiGroupWorker(10),
              //   'xpack-accessibility': kibanaPipeline.getPostBuildWorker('xpack-accessibility', {
              //     retryable('xpack-accessibility') {
              //       runbld('./test/scripts/jenkins_xpack_accessibility.sh', 'Execute xpack-accessibility')
              //     }
              //   }),
              //   // 'xpack-visualRegression': kibanaPipeline.getPostBuildWorker('xpack-visualRegression', { runbld('./test/scripts/jenkins_xpack_visual_regression.sh', 'Execute xpack-visualRegression') }),
              // ]),
            ])
          }
        }

        // TODO spit out flaky failures to the console
        kibanaPipeline.sendMail()
      }
    }
  }
}
