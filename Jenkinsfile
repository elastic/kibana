#!/bin/groovy

library 'kibana-pipeline-library@clone-fix'
kibanaLibrary.load()

parallel([
  node1: {
    node('linux && immutable') {
      print kibanaCheckout()
    }
  },
  switchCommit: {
    input "Switch commit"
    env.KIBANA_GIT_COMMIT = '36d469dfd5b41dacf8c6dad330cb8cea118ada9f'
  },
])

// test
