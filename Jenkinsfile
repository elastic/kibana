#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  workers.base(bootstrapped: false, size: 's', ramDisk: false) {
    runbld("test.sh", "test")
    runbld.junit()
  }
}
