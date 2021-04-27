#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

env.ES_SNAPSHOT_MANIFEST = 'https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.0.0/archives/20210422-191103_e86fc61daf7/manifest.json'

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: true, setCommitStatus: true) {
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
