#!/bin/groovy

if (!env.ghprbPullId) {
  print "Non-PR builds are now in Buildkite."
  return
}

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: true, setCommitStatus: true) {
  slackNotifications.onFailure(disabled: !params.NOTIFY_ON_FAILURE) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild(requireSuccess: githubPr.isTrackedBranchPr()) {
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
