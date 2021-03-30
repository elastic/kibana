#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: true, setCommitStatus: true) {
  slackNotifications.onFailure(disabled: !params.NOTIFY_ON_FAILURE) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
        catchError {
          workers.ci(name: 'ci-worker', size: 'xxl', ramDisk: true) {
            kibanaPipeline.buildOss(20)
            kibanaPipeline.ossCiGroupProcess(6)()
          }
        }
      }
    }
  }

  if (params.NOTIFY_ON_FAILURE) {
    kibanaPipeline.sendMail()
  }
}
