#!/bin/groovy

library 'kibana-pipeline-library@implement/ci-stats/v2-report'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  slackNotifications.onFailure(disabled: !params.NOTIFY_ON_FAILURE) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
        catchError {
          retryable.enable()

          kibanaPipeline.withTasks {
            task {
              kibanaPipeline.buildXpack(10)
            }

            task {
              kibanaPipeline.buildOss(10)
            }
          }
        }
      }
    }
  }

  if (params.NOTIFY_ON_FAILURE) {
    kibanaPipeline.sendMail()
  }
}
