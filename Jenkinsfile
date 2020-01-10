#!/bin/groovy

def NUMBER_OF_NODES = 25

def work = [:]
for(def i = 0; i < NUMBER_OF_NODES; i++) {
  work["node-${i}"] = {
    node('linux && immutable') {
      def innerWork = [:]
      for(def j = 0; j < 5; j++) {
        def x = j
        innerWork["work-${x}"] = {
          dir("dir-${x}") {
            doIt()
          }
        }
      }
      parallel(innerWork)
    }
  }
}

parallel(work)

def doIt() {
  def hadError = false

  for(def i = 0; i < 500; i++) {
    try {
      timeout(time: 3, unit: 'MINUTES') {
        checkout scm
      }
      sleep 30
    } catch(ex) {
      hadError = true
      catchError {
        sh 'curl --verbose --connect-timeout 5 https://github.com/elastic/kibana'
      }
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
