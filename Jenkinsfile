#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

catchErrors {
  error "I am error"
}

slackNotifications.onFailure()
