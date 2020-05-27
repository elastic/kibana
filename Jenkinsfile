#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true) {
  catchErrors {
    unstable "Test Error"
  }

  slackNotifications.sendFailedBuild(
    channel: '@brian.seeders'
  )
}
