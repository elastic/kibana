#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

node('flyweight') {
  emailNotifications.onFailure {
    sh 'exit 1'
  }
}
