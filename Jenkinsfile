#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  githubPr.withDefaultPrComments {
    catchError {
      node('flyweight') {
        retryable.enable()

        kibanaPipeline.notifyOnError {
          error "Error"
        }

        sleep 15
      }
    }
  }
}
