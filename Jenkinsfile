#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent { label 'immutable' }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build Stuff? :)') {
      steps {
        dir("${env.BASE_DIR}"){
            sh './.ci/run.sh'
        }
      }
    }
  }
}
