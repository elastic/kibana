#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

catchError {
  kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true, email: true) {
    error "Test Error"
    // node('flyweight') {
    //   sh 'exit 1'
    // }
  }
}

kibanaPipeline.sendMail([
  subject: '[7.9.0] ES Snapshot Verification Failure',
  extra: "Snapshot Manifest: https://storage.googleapis.com/kibana-ci-es-snapshots-daily/7.9.0/archives/20200511-194020_b90c7e3797f/manifest.json",
])
