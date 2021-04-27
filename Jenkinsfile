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
      try {
        input "Waiting"
      } catch (ex) {

      }
      print kibanaCheckout()
    }
  },
  node3: {
    node('linux && immutable') {
      sleep 30
      print kibanaCheckout()
    }
  },
  node4: {
    node('linux && immutable') {
      sleep 120
      print kibanaCheckout()
    }
  },
])
