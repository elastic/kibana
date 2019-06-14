#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent { label 'master || immutable' }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build Stuff? :)') {
      steps {
        dir("${env.BASE_DIR}"){
            sh './.ci/packer_cache.sh'
            sh './.ci/run.sh'
        }
      }
    }
  }
}
