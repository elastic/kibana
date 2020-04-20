#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    catchError {
      retryable.enable()
      kibanaPipeline.allCiTasks()
    }
  }

  retryable.printFlakyFailures()
  kibanaPipeline.sendMail()
}
