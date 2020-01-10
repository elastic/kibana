#!/bin/groovy

def NUMBER_OF_NODES = 25

def work = [:]
for(def i = 0; i < NUMBER_OF_NODES; i++) {
  work["node-${i}"] = {
    doIt()
  }
}

parallel(work)

def doIt() {
  node('linux && immutable') {
    def hadError = false

    for(def i = 0; i < 500; i++) {
      try {
        timeout(time: 2, unit: 'MINUTES') {
          sh 'curl --connect-timeout 5 https://github.com/elastic/kibana || true'
          checkout scm
        }
      } catch(ex) {
        hadError = true
        sh 'curl --connect-timeout 5 https://github.com/elastic/kibana || true'
        catchError {
          throw ex
        }
      }
    }

    if (hadError) {
      input("Waiting...")
    }
  }
}
