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
    stage('Checkout Kibana') {
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        dir("${BASE_DIR}"){
          checkout scm
        }
        stash allowEmpty: false, name: 'source', useDefaultExcludes: false
      }
    }
    stage('Checkout APM-ITS') {
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        dir("${APM_ITS}"){
          git changelog: false,
              credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba',
              poll: false,
              url: "git@github.com:elastic/${APM_ITS}.git"
        }
        stash allowEmpty: false, name: APM_ITS, useDefaultExcludes: false
      }
    }
    stage('Start ES - APM Server') {
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        unstash APM_ITS
        dir("${APM_ITS}"){
          sh './scripts/compose.py start master --no-kibana'
        }
      }
    }
    stage('Ingest data') {
      options { skipDefaultCheckout() }
      steps {
        unstash 'source'
        dir("${BASE_DIR}/x-pack/legacy/plugins/apm/cypress/ingest-data"){
          sh '''
            # Download static data
            curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output events.json

            # Ingest into ES
            node replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json
          '''
        }
      }
    }
    stage('Start Kibana') {
      options { skipDefaultCheckout() }
      steps {
        dir("${BASE_DIR}"){
          sh 'yarn start --no-base-path --csp.strict=false'
        }
      }
    }
    stage('Tests') {
      options { skipDefaultCheckout() }
      steps {
        dir("${BASE_DIR}/x-pack/legacy/plugins/apm/cypress"){
          sh 'yarn cypress run'
        }
      }
    }
  }
}
