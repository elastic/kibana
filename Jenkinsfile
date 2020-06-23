#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  node('linux && immutable') {
    runbld("time", "test")
    runbld.junit()
  }
}
