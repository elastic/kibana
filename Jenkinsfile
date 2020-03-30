#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    catchError {
      retryable.enable()
      kibanaPipeline.newPipeline {
        catchError {
          def metricsJson = toJSON(kibanaPipeline.getFinishedSuites()).toString()
          dir('target/test-metrics') {
            def date = (new Date()).format("yyyyMMdd-HHmmss")
            def filename = "metrics-${date}.json"

            writeFile(file: filename, text: metricsJson)

            if (!githubPr.isPr()) {
              googleStorageUpload(
                credentialsId: 'kibana-ci-gcs-plugin',
                bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
                pattern: filename,
              )

              def status = buildUtils.getBuildStatus()
              if (status == 'SUCCESS' || status == 'UNSTABLE') {
                sh "cp '${filename}' latest.json"
                googleStorageUpload(
                  credentialsId: 'kibana-ci-gcs-plugin',
                  bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
                  pattern: 'latest.json',
                )
              }
            }
          }
        }
      }
    }
  }

  retryable.printFlakyFailures()
  kibanaPipeline.sendMail()
}
