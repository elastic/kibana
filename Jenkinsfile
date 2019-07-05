#!/usr/bin/env groovy

pipeline {
  agent none
  environment {
    // Global vars
    CI = true
    BASE_DIR = "."
    CI_DIR = "./.ci"

    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins
    MAIN_CACHE_DIR = "${HOME}/.kibana" // /var/lib/jenkins/.kibana

    WORKSPACE_CACHE_DIR = "${MAIN_CACHE_DIR}/workspace_cache" // /var/lib/jenkins/.kibana/workspace_cache
    WORKSPACE_CACHE_NAME = "${WORKSPACE_CACHE_DIR}/BUILD_ID-${BUILD_ID}.tgz" // /var/lib/jenkins/.kibana/workspace_cache/BUILD_ID-SOMEBUILDNUMBER.tgz

    BOOTSTRAP_CACHE_DIR = "${MAIN_CACHE_DIR}/bootstrap_cache" // /var/lib/jenkins/.kibana/bootstrap_cache

    TEMP_PIPELINE_SETUP_DIR = "src/dev/temp_pipeline_setup"

    // PIPELINE_DIR = "${CI_DIR}pipeline-setup/"

    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"


    CREDENTIALS_ID ='kibana-ci-gcs-plugin'
    BUCKET = "gs://kibana-ci-artifacts/jobs/${JOB_NAME}/${BUILD_NUMBER}"
    PATTERN = "${WORKSPACE_CACHE_NAME}"
  }
  stages {
    stage('Install All-The-Things') {
      agent { label 'linux || immutable' }
      steps {
        dir("${env.BASE_DIR}"){
          sh "${CI_DIR}/run_pipeline.sh"
          script {
            dumpEnv()
            dumpSize("${WORKSPACE}")
            createWorkspaceCache()
            zip zipFile: "${WORKSPACE_CACHE_NAME}", archive: false, glob: '*'
            dumpSize("${WORKSPACE_CACHE_NAME}")
          }
          step([$class: 'ClassicUploadStep', credentialsId: env.CREDENTIALS_ID, bucket: env.BUCKET, pattern: "${WORKSPACE_CACHE_NAME}"])
        }
      }
    }
    stage('kibana-intake') {
      agent { label 'linux || immutable' }
      // options { skipDefaultCheckout() }
      steps {
        script {
          createWorkspaceCache()
        }
//         deleteDir()
        // Download from GCS bucket object named PATTERN to directory LOCAL_DIR.
        step([$class: 'DownloadStep', credentialsId: env.CREDENTIALS_ID,  bucketUri: "gs://${env.BUCKET}/${env.PATTERN}", localDirectory: "${WORKSPACE}"])
        sh './test/scripts/jenkins_unit.sh'
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
def createWorkspaceCache(){
  script {
    sh "mkdir -p ${WORKSPACE_CACHE_DIR}"
  }
}
// def tarWorkspace(){
//   script {
//     sh "tar -czf ${WORKSPACE_CACHE_NAME} ${BASE_DIR}"
//     sh "du -hcs ${WORKSPACE_CACHE_NAME}"
//   }
// }
def dumpSize(String x){
  script {
    sh "du -hcs ${x}"
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
