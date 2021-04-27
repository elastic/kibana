#!/bin/groovy

library 'kibana-pipeline-library@clone-fix'
kibanaLibrary.load()

parallel([
  node1: {
    node('linux && immutable') {
      print kibanaCheckout()
    }
  }
  node2: {
    node('linux && immutable') {
      sleep 60
      parallel([
        switchCommit: {
          sleep 5
          env.KIBANA_GIT_COMMIT = '36d469dfd5b41dacf8c6dad330cb8cea118ada9f'
        },
        clone: {
          print kibanaCheckout()
        }
      ])
    }
  },
])

node('linux && immutable') {
  print kibanaCheckout()
}

// test
// test
