#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

node('linux && immutable') {
  checkout scm
  dir('kibana') {
    sh '.ci/packer_cache.sh'
  }
}
