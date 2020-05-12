#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

catchError {
  node('flyweight') {
    sh 'exit 1'
  }
}

kibanaPipeline.sendMail([extra: 'Some extra info', subject: 'Custom Subject'])
