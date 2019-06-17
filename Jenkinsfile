#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent { label 'linux || immutable' }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Kickoff') {
      steps {
        dir("${env.BASE_DIR}"){
            sh './.ci/run.sh'
        }
      }
    }
  }
}
