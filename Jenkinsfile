#!/usr/bin/env groovy
@Library('apm@current') _

pipeline {
  agent { label 'master || immutable' }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build Stuff? :)') {
      steps {
        withEnvWrapper() {
            dir("${BASE_DIR}"){
                sh './.ci/run.sh'
            }
        }
      }
    }
  }
}
