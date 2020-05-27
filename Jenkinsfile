#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true) {
  catchErrors {
    error "Test Error"
  }

  slackNotifications.sendFailedBuild(
    channel: '@brian.seeders'
  )
}
