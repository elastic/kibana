#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
  workers.base(bootstrapped: false, size: 'flyweight', ramDisk: false) {
    sleep 10
    error "Error"
  }
}
