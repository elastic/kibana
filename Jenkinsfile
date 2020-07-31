#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

slackNotifications.onFailure {
  catchErrors {
    kibanaPipeline.notifyOnError {
      error "I am error"
    }
  }
  sleep 30
  error "I am final error"
}

if (params.NOTIFY_ON_FAILURE) {
  kibanaPipeline.sendMail()
}
