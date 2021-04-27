#!/bin/groovy

library 'kibana-pipeline-library@clone-fix'
kibanaLibrary.load()

node('linux && immutable') {
  print kibanaCheckout()
}

node('linux && immutable') {
  print kibanaCheckout()
}
