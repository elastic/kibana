#!/bin/groovy

library 'kibana-pipeline-library@clone-fix'
kibanaLibrary.load()

parallel([
  node1: {
    node('linux && immutable') {
      print kibanaCheckout()
    }
  },
  node2: {
    node('linux && immutable') {
      print kibanaCheckout()
    }
  },
  node3: {
    node('linux && immutable') {
      sleep 10
      print kibanaCheckout()
    }
  },
])
