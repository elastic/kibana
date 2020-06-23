#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  workers.base(bootstrapped: false, size: 'linux && immutable', ramDisk: false) {
    runbld("time", "test")
    runbld.junit()
  }
}
