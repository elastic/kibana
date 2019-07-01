#!/usr/bin/env groovy

pipeline {
  agent none 
  environment {
    // Global vars
    CI = true
    BASE_DIR = "."
    CI_DIR = "./.ci/"

    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins
    MAIN_CACHE_DIR = "${HOME}/.kibana" // /var/lib/jenkins/.kibana 
    BOOTSTRAP_CACHE_DIR = "${MAIN_CACHE_DIR}/bootstrap_cache" // /var/lib/jenkins/.kibana/bootstrap_cache 
    TEMP_PIPELINE_SETUP_DIR = "src/dev/temp_pipeline_setup"
    
    // PIPELINE_DIR = "${CI_DIR}pipeline-setup/"




    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
  }
  stages {
    // stage('Extract Boot Cache, Setup, and Checkout Sibling Elastic Search') {
    stage('Extract Boot Cache') {
      agent { label 'linux || immutable' } 
      steps {
        dir("${env.BASE_DIR}"){
          script {
            dumpEnv()
          }
          // sh '${CI_DIR}run_pipeline.sh'
          sh 'src/dev/temp_pipeline_setup/extract_bootstrap_cache.sh'
          sh 'echo "\n\t### [TODO] create and upload workspace cache to gcs"'
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
      options { skipDefaultCheckout() }
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Functional Tests') {
      agent { label 'linux || immutable' } 
      options { skipDefaultCheckout() }
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Finish') {
      agent { label 'linux || immutable' } 
      options { skipDefaultCheckout() }
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