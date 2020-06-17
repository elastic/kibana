#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true) {
  workers.base(bootstrapped: false, ramDisk: false, size: 'flyweight') {
    sleep 15
    githubCommitStatus.onFinish()
  }
}
