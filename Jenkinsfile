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
        sh 'env > env.txt' 
        script {
          for (String x: readFile('env.txt').split("\r?\n")) {
            println "# ENV VAR: ${x}"
          }
        }
        dir("${env.BASE_DIR}"){
            sh './.ci/run.sh'
        }
      }
    }
  }
}
