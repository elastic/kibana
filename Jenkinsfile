#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 120, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        githubPr.withDefaultPrComments {
          print "hello"
        }
      }
    }
  }
}
