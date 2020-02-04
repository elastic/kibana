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
            def queue = [oss: []]
            def finishedSuites = [oss: [], xpack: []]

            parallel([
              // 'kibana-intake-agent': kibanaPipeline.intakeWorker('kibana-intake', './test/scripts/jenkins_unit.sh'),
              // 'x-pack-intake-agent': kibanaPipeline.intakeWorker('x-pack-intake', './test/scripts/jenkins_xpack.sh'),
              'kibana-xpack-agent': kibanaPipeline.withWorkers('kibana-xpack-tests',
                {
                  kibanaPipeline.buildOss()
                  kibanaPipeline.prepareOssTestQueue(queue)
                },
                {
                  try {
                    kibanaPipeline.buildXpack()
                    kibanaPipeline.prepareXpackTestQueue(queue)
                  } finally {
                    if (!queue.containsKey('xpack')) {
                      queue.xpack = []
                    }
                  }
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
                'xpack-functional-13': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 13),
                'xpack-functional-14': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 14),
                'xpack-functional-15': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 15),
                'xpack-functional-16': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 16),
                'xpack-functional-17': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 17),
                'xpack-functional-18': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 18),
                'xpack-functional-19': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 19),
                'xpack-functional-20': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 20),
                'xpack-functional-21': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 21),
                'xpack-functional-22': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 22),
                'xpack-functional-23': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 23),
                'xpack-functional-24': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 24),
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
