#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  githubPr.withDefaultPrComments {
    ciStats.trackBuild {
      catchError {
        workers.base(ramDisk: false, bootstrapped: false, size: 'flyweight') {

          kibanaPipeline.notifyOnError {
            kibanaPipeline.ossCiGroupProcess('xyz')()
          }

          sleep 15
        }
      }
    }
  }
}
