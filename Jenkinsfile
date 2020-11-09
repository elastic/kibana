#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  slackNotifications.onFailure(disabled: !params.NOTIFY_ON_FAILURE) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
        catchError {
          retryable.enable()
          kibanaPipeline.allCiTasks()
        }
      }
    }
  }

  if (params.NOTIFY_ON_FAILURE) {
    kibanaPipeline.sendMail()
  }
}
