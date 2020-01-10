#!/bin/groovy

def NUMBER_OF_NODES = 25

def work = [:]
for(def i = 0; i < NUMBER_OF_NODES; i++) {
  work["node-${i}"] = {
    node('linux && immutable') {
      for(def j = 0; j < 5; j++) {
        dir("dir-${j}") {
          doIt()
        }
      }
    }
  }
}

parallel(work)

def doIt() {
  def hadError = false

  for(def i = 0; i < 500; i++) {
    try {
      timeout(time: 2, unit: 'MINUTES') {
        checkout scm
      }
      sleep 30
    } catch(ex) {
      hadError = true
      sh 'curl --connect-timeout 5 https://github.com/elastic/kibana || true'
      catchError {
        throw ex
      }
    }

    catchError {
      sh 'rm -rf kibana'
    }
  }

  if (hadError) {
    input("Waiting...")
  }
}
