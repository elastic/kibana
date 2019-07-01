#!/usr/bin/env groovy

pipeline {
  agent none 
  environment {
    BASE_DIR = "."
    CI = true
    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins
    CACHE_DIR = "${HOME}/.kibana/bootstrap_cache/"  
    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
  }
  stages {
    stage('bootstrap') {
      agent { label 'linux || immutable' } 
      environment {
        // PIPELINE_DIR = "./.ci/pipeline-setup/"
        CI_DIR = "./.ci/"
        PIPELINE_DIR = "${CI_DIR}pipeline-setup/"
      }
      steps {
        dir("${env.BASE_DIR}"){
          script {
            dumpEnv()
          }
          sh '${CI_DIR}run_pipeline.sh'
          sh 'echo "\n\t### create and upload workspace cache to gcs"'
        }
      }
    }
    stage('kibana-intake') {
      agent { label 'linux || immutable' } 
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        // sh './test/scripts/jenkins_unit.sh'
        sh 'echo "Download workspace cache"'
      }
    }











    stage('Component Integration Tests') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Functional Tests') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Finish') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
  }
}
def dumpEnv(){
  sh 'env > env.txt' 
  script {
    for (String x: readFile('env.txt').split("\r?\n")) {
      println "# ENV VAR: ${x}"
    }
  }   
  // Cleanup
  sh 'rm env.txt' 
}