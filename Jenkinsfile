#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    def queue = [oss: []]
    def finishedSuites = [oss: [], xpack: [], ossFirefox: [], xpackFirefox: []]

    catchError {
      // retryable.enable()
      parallel([
        // 'kibana-intake-agent': kibanaPipeline.intakeWorker('kibana-intake', './test/scripts/jenkins_unit.sh'),
        // 'x-pack-intake-agent': kibanaPipeline.intakeWorker('x-pack-intake', './test/scripts/jenkins_xpack.sh'),
        'kibana-functional-agent': workers.functional(
          setup: {
            googleStorageDownload(
              credentialsId: 'kibana-ci-gcs-plugin',
              bucketUri: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}/functional_test_suite_metrics.json",
              localDirectory: 'target',
              pathPrefix: kibanaPipeline.getTargetBranch(),
            )
            kibanaPipeline.bash("source src/dev/ci_setup/setup_env.sh; node scripts/create_functional_test_plan.js", "Create functional test plan")
            kibanaPipeline.buildOss()
            kibanaPipeline.prepareOssTestQueue(queue)
          },
          parallelExtra: {
            try {
              kibanaPipeline.buildXpack()
              kibanaPipeline.prepareXpackTestQueue(queue)
            } finally {
              if (!queue.containsKey('xpack')) {
                queue.xpack = []
                queue.xpackFirefox = []
              }
            }
          },
          processes: [
            'kibana-functional-1': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 1),
            'kibana-functional-2': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 2),
            'kibana-functional-3': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 3),
            'kibana-functional-4': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 4),
            'kibana-functional-5': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 5),
            'kibana-functional-6': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 6),
            'kibana-functional-7': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 7),
            'kibana-functional-8': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 8),
            'kibana-functional-9': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 9),
            'kibana-functional-10': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 10),
            'kibana-functional-11': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 11),
            'kibana-functional-12': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 12),
            'kibana-functional-13': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 13),
            'kibana-functional-14': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 14),
            'kibana-functional-15': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 15),
            'kibana-functional-16': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 16),
            'kibana-functional-17': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 17),
            'kibana-functional-18': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 18),
            'kibana-functional-19': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 19),
            'kibana-functional-20': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 20),
            'kibana-functional-21': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 21),
            'kibana-functional-22': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 22),
            'kibana-functional-23': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 23),
            'kibana-functional-24': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 24),
            // 'kibana-functional-25': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 25),
            // 'kibana-functional-26': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 26),
            // 'kibana-functional-27': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 27),
            // 'kibana-functional-28': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 28),
            // 'kibana-functional-29': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 29),
            // 'kibana-functional-30': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 30),
            // 'kibana-functional-31': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 31),
            // 'kibana-functional-32': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 32),
            // 'kibana-functional-33': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 33),
            // 'kibana-functional-34': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 34),
            // 'kibana-functional-35': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 35),
            // 'kibana-functional-36': kibanaPipeline.getFunctionalQueueWorker(queue, finishedSuites, 36),
            // 'xpack-visualRegression': kibanaPipeline.getPostBuildWorker('xpack-visualRegression', { runbld('./test/scripts/jenkins_xpack_visual_regression.sh', 'Execute xpack-visualRegression') }),
            // 'xpack-siemCypress': kibanaPipeline.functionalTestProcess('xpack-siemCypress', './test/scripts/jenkins_siem_cypress.sh'),
          ],
          postProcess: {
            catchError {
              def metricsJson = toJSON(finishedSuites).toString()
              dir('target/test-metrics') {
                def date = (new Date()).format("yyyyMMdd-HHmmss")
                def filename = "metrics-${date}.json"

                writeFile(file: filename, text: metricsJson)

                if (!githubPr.isPr()) {
                  googleStorageUpload(
                    credentialsId: 'kibana-ci-gcs-plugin',
                    bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
                    pattern: filename,
                    sharedPublicly: true,
                    showInline: true,
                  )

                  def status = buildUtils.getBuildStatus()
                  if (status == 'SUCCESS' || status == 'UNSTABLE') {
                    sh "cp '${filename}' latest.json"
                    googleStorageUpload(
                      credentialsId: 'kibana-ci-gcs-plugin',
                      bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
                      pattern: 'latest.json',
                      sharedPublicly: true,
                      showInline: true,
                    )
                  }
                }
              }
            }
          }
        ),
      ])
    }
  }

  retryable.printFlakyFailures()
  kibanaPipeline.sendMail()
}
