#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

def PARALLEL_COUNT = 25
def ITERATIONS_PER = 10

def worker = {
  return {
    for (def i = 0; i < ITERATIONS_PER; i++) {
      node('flyweight') {
        catchError {
          sh 'curl https://github.com/ --verbose || true'
        }
        try {
          checkout scm
        } catch (ex) {
          print ex.toString()
          catchError {
            sh 'curl https://google.com/ --verbose || true'
          }
          catchError {
            sh 'curl https://github.com/ --verbose || true'
          }
        }
      }
    }
  }
}

def workers = [:]
for (def i = 0; i < PARALLEL_COUNT; i++) {
  workers["worker-${i}"] = worker()
}

parallel(workers)
