#!/usr/bin/env groovy

library identifier: 'apm@current',
retriever: modernSCM(
  [$class: 'GitSCMSource',
  credentialsId: 'f94e9298-83ae-417e-ba91-85c279771570',
  id: '37cf2c00-2cc7-482e-8c62-7bbffef475e2',
  remote: 'git@github.com:elastic/apm-pipeline-library.git'])

pipeline {
  agent { label 'linux && immutable' }
  environment {
    BASE_DIR = 'src/github.com/elastic/kibana'
    HOME = "${env.WORKSPACE}"
    APM_ITS = 'apm-integration-testing'
    CYPRESS_DIR = 'x-pack/legacy/plugins/apm/cypress'
  }
  options {
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20', daysToKeepStr: '30'))
    timestamps()
    ansiColor('xterm')
    disableResume()
    durabilityHint('PERFORMANCE_OPTIMIZED')
  }
  triggers {
    issueCommentTrigger('(?i).*jenkins\\W+run\\W+(?:the\\W+)?e2e(?:\\W+please)?.*')
  }
  stages {
    stage('Checkout') {
      options { skipDefaultCheckout() }
      steps {
        gitCheckout(basedir: "${BASE_DIR}", githubNotifyFirstTimeContributor: false)
        dir("${APM_ITS}"){
          git changelog: false,
              credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba',
              poll: false,
              url: "git@github.com:elastic/${APM_ITS}.git"
        }
      }
    }
    stage('Start services') {
      options { skipDefaultCheckout() }
      steps {
        dir("${APM_ITS}"){
          sh './scripts/compose.py start master --no-kibana'
        }
      }
    }
    stage('Prepare Kibana') {
      options { skipDefaultCheckout() }
      environment {
        JENKINS_NODE_COOKIE = 'dontKillMe'
      }
      steps {
        dir("${BASE_DIR}"){
          sh script: "${CYPRESS_DIR}/ci/prepare-kibana.sh"
        }
      }
      post {
        always {
          archiveArtifacts(allowEmptyArchive: true, artifacts: "${BASE_DIR}/${CYPRESS_DIR}/ingest-data.log,${BASE_DIR}/kibana.log")
        }
      }
    }
    stage('Smoke Tests'){
      options { skipDefaultCheckout() }
      steps{
        script {
          def nodeDocker = docker.build('node-cypress', "${CYPRESS_DIR}/ci")
          nodeDocker.inside('--network="host"'){
            dir("${BASE_DIR}/${CYPRESS_DIR}"){
              sh(label: 'Build tests', script: 'npm install && yarn install')
              sh(label: 'Execute Smoke Tests', script: './node_modules/.bin/cypress run')
            }
          }
        }
      }
      post {
        always {
          dir("${BASE_DIR}/${CYPRESS_DIR}"){
            archiveArtifacts(allowEmptyArchive: false, artifacts: '**/*')
            junit(allowEmptyResults: true, testResults: '*e2e-tests.xml')
          }
        }
      }
    }
  }
}
