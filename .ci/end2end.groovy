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
    PIPELINE_LOG_LEVEL = 'DEBUG'
  }
  options {
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '40', artifactNumToKeepStr: '20', daysToKeepStr: '30'))
    timestamps()
    ansiColor('xterm')
    disableResume()
    durabilityHint('PERFORMANCE_OPTIMIZED')
  }
  triggers {
    issueCommentTrigger('(?i).*jenkins\\W+run\\W+(?:the\\W+)?e2e(?:\\W+please)?.*')
  }
  parameters {
    booleanParam(name: 'FORCE', defaultValue: false, description: 'Whether to force the run.')
  }
  stages {
    stage('Checkout') {
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        gitCheckout(basedir: "${BASE_DIR}", githubNotifyFirstTimeContributor: false,
                    shallow: false, reference: "/var/lib/jenkins/.git-references/kibana.git")
        script {
          dir("${BASE_DIR}"){
            def regexps =[ "^x-pack/legacy/plugins/apm/.*" ]
            env.APM_UPDATED = isGitRegionMatch(patterns: regexps)
          }
        }
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
      when {
        anyOf {
          expression { return params.FORCE }
          expression { return env.APM_UPDATED != "false" }
        }
      }
      steps {
        notifyStatus('Starting services', 'PENDING')
        dir("${APM_ITS}"){
          sh './scripts/compose.py start master --no-kibana'
        }
      }
      post {
        unsuccessful {
          notifyStatus('Environmental issue', 'FAILURE')
        }
      }
    }
    stage('Prepare Kibana') {
      options { skipDefaultCheckout() }
      when {
        anyOf {
          expression { return params.FORCE }
          expression { return env.APM_UPDATED != "false" }
        }
      }
      environment {
        JENKINS_NODE_COOKIE = 'dontKillMe'
      }
      steps {
        notifyStatus('Preparing kibana', 'PENDING')
        dir("${BASE_DIR}"){
          sh script: "${CYPRESS_DIR}/ci/prepare-kibana.sh"
        }
      }
      post {
        unsuccessful {
          notifyStatus('Kibana warm up failed', 'FAILURE')
        }
      }
    }
    stage('Smoke Tests'){
      options { skipDefaultCheckout() }
      when {
        anyOf {
          expression { return params.FORCE }
          expression { return env.APM_UPDATED != "false" }
        }
      }
      steps{
        notifyStatus('Running smoke tests', 'PENDING')
        dir("${BASE_DIR}"){
          sh '''
            jobs -l
            docker build --tag cypress ${CYPRESS_DIR}/ci
            docker run --rm -t --user "$(id -u):$(id -g)" \
                    -v `pwd`:/app --network="host" \
                    --name cypress cypress'''
        }
      }
      post {
        always {
          dir("${BASE_DIR}"){
            archiveArtifacts(allowEmptyArchive: false, artifacts: "${CYPRESS_DIR}/screenshots/**,${CYPRESS_DIR}/videos/**,${CYPRESS_DIR}/*e2e-tests.xml")
            junit(allowEmptyResults: true, testResults: "${CYPRESS_DIR}/*e2e-tests.xml")
          }
          dir("${APM_ITS}"){
            sh 'docker-compose logs > apm-its.log || true'
            sh 'docker-compose down -v || true'
            archiveArtifacts(allowEmptyArchive: false, artifacts: 'apm-its.log')
          }
        }
        unsuccessful {
          notifyStatus('Test failures', 'FAILURE')
        }
        success {
          notifyStatus('Tests passed', 'SUCCESS')
        }
      }
    }
  }
  post {
    always {
      dir("${BASE_DIR}"){
        archiveArtifacts(allowEmptyArchive: true, artifacts: "${CYPRESS_DIR}/ingest-data.log,kibana.log")
      }
    }
  }
}

def notifyStatus(String description, String status) {
  withGithubNotify.notify('end2end-for-apm-ui', description, status, getBlueoceanDisplayURL())
}
