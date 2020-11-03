#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  githubPr.withDefaultPrComments {
    catchError {
      node('flyweight') {
        retryable.enable()

        def counter = 0
        kibanaPipeline.notifyOnError {
          retryable('test') {
            if (counter < 1) {
              counter++

              error "Error"
            } else {
              sleep 10
            }
          }
        }
      }
    }
  }
}
