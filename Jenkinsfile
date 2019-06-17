#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent { label 'linux || immutable' }
  environment {
    BASE_DIR = "."
    GIT_BRANCH = "master"
  }
  stages {
    stage('Kickoff') {
      steps {
        dir("${env.BASE_DIR}"){
 	    sh 'whoami'
            sh './.ci/run.sh'
        }
      }
    }
  }
}
