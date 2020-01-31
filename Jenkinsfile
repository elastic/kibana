#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 240, unit: 'MINUTES') { // TODO
    timestamps {
      ansiColor('xterm') {
        githubPr.withDefaultPrComments {
          catchError {
            retryable.enable()
            def queue = []
            def finishedSuites = []

            parallel([
              // 'kibana-intake-agent': kibanaPipeline.intakeWorker('kibana-intake', './test/scripts/jenkins_unit.sh'),
              // 'x-pack-intake-agent': kibanaPipeline.intakeWorker('x-pack-intake', './test/scripts/jenkins_xpack.sh'),
              // 'kibana-oss-agent': kibanaPipeline.withWorkers('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
              //   'oss-firefoxSmoke': kibanaPipeline.getPostBuildWorker('firefoxSmoke', {
              //     retryable('kibana-firefoxSmoke') {
              //       runbld('./test/scripts/jenkins_firefox_smoke.sh', 'Execute kibana-firefoxSmoke')
              //     }
              //   }),
              //   'oss-ciGroup1': kibanaPipeline.getOssCiGroupWorker(1),
              //   'oss-ciGroup2': kibanaPipeline.getOssCiGroupWorker(2),
              //   'oss-ciGroup3': kibanaPipeline.getOssCiGroupWorker(3),
              //   'oss-ciGroup4': kibanaPipeline.getOssCiGroupWorker(4),
              //   'oss-ciGroup5': kibanaPipeline.getOssCiGroupWorker(5),
              //   'oss-ciGroup6': kibanaPipeline.getOssCiGroupWorker(6),
              //   'oss-ciGroup7': kibanaPipeline.getOssCiGroupWorker(7),
              //   'oss-ciGroup8': kibanaPipeline.getOssCiGroupWorker(8),
              //   'oss-ciGroup9': kibanaPipeline.getOssCiGroupWorker(9),
              //   'oss-ciGroup10': kibanaPipeline.getOssCiGroupWorker(10),
              //   'oss-ciGroup11': kibanaPipeline.getOssCiGroupWorker(11),
              //   'oss-ciGroup12': kibanaPipeline.getOssCiGroupWorker(12),
              //   'oss-accessibility': kibanaPipeline.getPostBuildWorker('accessibility', {
              //     retryable('kibana-accessibility') {
              //       runbld('./test/scripts/jenkins_accessibility.sh', 'Execute kibana-accessibility')
              //     }
              //   }),
              //   // 'oss-visualRegression': kibanaPipeline.getPostBuildWorker('visualRegression', { runbld('./test/scripts/jenkins_visual_regression.sh', 'Execute kibana-visualRegression') }),
              // ]),
              'kibana-xpack-agent': kibanaPipeline.withWorkers('kibana-xpack-tests',
                {
                  kibanaPipeline.buildXpack()
                  kibanaPipeline.prepareXpackTestQueue(queue)
                }, [
                'xpack-functional-1': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 1),
                'xpack-functional-2': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 2),
                'xpack-functional-3': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 3),
                'xpack-functional-4': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 4),
                'xpack-functional-5': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 5),
                'xpack-functional-6': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 6),
                'xpack-functional-7': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 7),
                'xpack-functional-8': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 8),
                'xpack-functional-9': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 9),
                'xpack-functional-10': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 10),
                'xpack-functional-11': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 11),
                'xpack-functional-12': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 12),
                // 'xpack-visualRegression': kibanaPipeline.getPostBuildWorker('xpack-visualRegression', { runbld('./test/scripts/jenkins_xpack_visual_regression.sh', 'Execute xpack-visualRegression') }),
              ]),
            ])

            catchError {
              print finishedSuites
              print toJSON(finishedSuites).toString()
            }
          }
        }

        retryable.printFlakyFailures()
        kibanaPipeline.sendMail()
      }
    }
  }
}
