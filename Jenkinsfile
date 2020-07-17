#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: false, setCommitStatus: true) {
  githubPr.withDefaultPrComments {
    catchErrors {
      error "Test Error"
    }
    githubPr.sendComment()
    sleeep 3
    githubPr.sendComment()
    sleep 30
  }

  if (params.NOTIFY_ON_FAILURE) {
    slackNotifications.onFailure()
    kibanaPipeline.sendMail()
  }
}
