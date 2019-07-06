#!/usr/bin/env groovy

pipeline {
  agent none
  environment {
    // Global vars
    CI = true
    BASE_DIR = "."
    CI_DIR = "./.ci"

    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins

    MAIN_CACHE_DIR = "${JENKINS_HOME}/.kibana" // /var/lib/jenkins/.kibana
    BOOTSTRAP_CACHE_DIR = "${MAIN_CACHE_DIR}/bootstrap_cache" // /var/lib/jenkins/.kibana/bootstrap_cache

    WORKSPACE_DIR = "${JENKINS_HOME}/workspace" // /var/lib/jenkins/workspace

    WORKSPACE_CACHE_DIR = "${MAIN_CACHE_DIR}/workspace_cache" // /var/lib/jenkins/.kibana/workspace_cache
    WORKSPACE_CACHE_NAME = "JOB_NAME-${JOB_NAME}-BUILD_ID-${BUILD_ID}.tgz"
    // /var/lib/jenkins/.kibana/workspace_cache/JOB_NAME-SOMEBRANCHNAME-BUILD_ID-SOMEBUILDNUMBER.tgz
    FULL_WORKSPACE_CACHE_PATH = "${WORKSPACE_CACHE_DIR}/${WORKSPACE_CACHE_NAME}"

    TEMP_PIPELINE_SETUP_DIR = "src/dev/temp_pipeline_setup"
    // PIPELINE_DIR = "${CI_DIR}pipeline-setup/"
    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
    CREDENTIALS_ID ='kibana-ci-gcs-plugin'
    BUCKET = "gs://kibana-ci-artifacts/jobs/${JOB_NAME}/${BUILD_NUMBER}"
    PATTERN = "${FULL_WORKSPACE_CACHE_PATH}"
  }
  stages {
    stage('Install All-The-Things') {
      agent { label 'linux || immutable' }
      steps {
        dir("${env.BASE_DIR}"){
          sh "${CI_DIR}/run_pipeline.sh"
          script {
            dumpEnv()
            createWorkspaceCache()
            tarAll()
            dumpSizes(["${WORKSPACE}", "${WORKSPACE_DIR}/elasticsearch", "${FULL_WORKSPACE_CACHE_PATH}"])
          }
          step([$class: 'ClassicUploadStep',
            credentialsId: env.CREDENTIALS_ID, bucket: env.BUCKET, pattern: env.PATTERN])
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
        step([$class: 'DownloadStep', credentialsId: env.CREDENTIALS_ID,  bucketUri: "gs://kibana-ci-artifacts/jobs/kibana-automation-pipeline/${BUILD_ID}/var/lib/jenkins/.kibana/workspace_cache/JOB_NAME-kibana-automation-pipeline-BUILD_ID-${BUILD_ID}.tgz", localDirectory: "${WORKSPACE_CACHE_DIR}"])
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
def tarGlobs(){
  return "${WORKSPACE_DIR}/elasticsearch/* ${WORKSPACE_DIR}/${JOB_NAME}/*"
}
def tarAll(){
  dir("${env.WORKSPACE_CACHE_DIR}"){
    script {
      sh "tar -czf ${WORKSPACE_CACHE_NAME} ${tarGlobs()}"
    }
  }
}
def createWorkspaceCache(){
  script {
    sh "mkdir -p ${WORKSPACE_CACHE_DIR}"
  }
}
def dumpSizes(xs){
     xs.each { dumpSize(it) }
}
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
