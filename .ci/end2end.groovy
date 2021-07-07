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
    E2E_DIR = 'x-pack/plugins/apm/e2e'
    UPTIME_E2E_DIR = 'x-pack/plugins/uptime/e2e'
    PIPELINE_LOG_LEVEL = 'INFO'
    KBN_OPTIMIZER_THEMES = 'v7light'
    GITHUB_CHECK_APM_UI = 'end2end-for-apm-ui'
    GITHUB_CHECK_UPTIME_UI = 'end2end-for-uptime-ui'
    GCS_UPLOAD_PREFIX = 'prefix' // forced to set the variable even though it's not required in this pipeline (https://github.com/elastic/kibana/pull/52449)
  }
  options {
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10', daysToKeepStr: '30'))
    timestamps()
    ansiColor('xterm')
    disableResume()
    durabilityHint('PERFORMANCE_OPTIMIZED')
  }
  triggers {
    issueCommentTrigger('(?i)(retest|.*jenkins\\W+run\\W+(?:the\\W+)?e2e?.*)')
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
        setEnvVar('RUN_APM_E2E', (params.FORCE || analyseBuildReasonForApmUI()))
        setEnvVar('RUN_UPTIME_E2E', (params.FORCE || analyseBuildReasonForUptimeUI()))
      }
    }
    stage('e2e') {
      when {
        anyOf {
          expression { return env.RUN_APM_E2E != "false" }
          expression { return env.RUN_UPTIME_E2E != "false" }
        }
      }
      parallel {
        stage('APM-UI') {
          // This stage reuses the top-level agent
          stages {
            stage('Prepare build context') {
              options { skipDefaultCheckout() }
              steps {
                pipelineManager([ cancelPreviousRunningBuilds: [ when: 'PR' ] ])
              }
            }
            stage('Prepare Kibana') {
              options { skipDefaultCheckout() }
              when { expression { return env.RUN_APM_E2E != "false" } }
              environment {
                JENKINS_NODE_COOKIE = 'dontKillMe'
              }
              steps {
                notifyStatus(env.GITHUB_CHECK_APM_UI, 'Preparing kibana', 'PENDING')
                dir("${BASE_DIR}"){
                  sh "${E2E_DIR}/ci/prepare-kibana.sh"
                }
              }
              post {
                unsuccessful {
                  notifyStatus(env.GITHUB_CHECK_APM_UI, 'Kibana warm up failed', 'FAILURE')
                }
              }
            }
            stage('Smoke Tests'){
              options { skipDefaultCheckout() }
              when { expression { return env.RUN_APM_E2E != "false" } }
              steps{
                notifyTestStatus(env.GITHUB_CHECK_APM_UI, 'Running smoke tests', 'PENDING')
                dir("${BASE_DIR}"){
                  sh "${E2E_DIR}/ci/run-e2e.sh"
                }
              }
              post {
                always {
                  dir("${BASE_DIR}/${E2E_DIR}"){
                    archiveArtifacts(allowEmptyArchive: false, artifacts: 'cypress/screenshots/**,cypress/videos/**,cypress/test-results/*e2e-tests.xml')
                    junit(allowEmptyResults: true, testResults: 'cypress/test-results/*e2e-tests.xml')
                    dir('tmp/apm-integration-testing'){
                      sh 'docker-compose logs > apm-its-docker.log || true'
                      sh 'docker-compose down -v || true'
                      archiveArtifacts(allowEmptyArchive: true, artifacts: 'apm-its-docker.log')
                    }
                    archiveArtifacts(allowEmptyArchive: true, artifacts: 'tmp/*.log')
                  }
                }
                unsuccessful {
                  notifyTestStatus(env.GITHUB_CHECK_APM_UI, 'Test failures', 'FAILURE')
                }
                success {
                  notifyTestStatus(env.GITHUB_CHECK_APM_UI, 'Tests passed', 'SUCCESS')
                }
              }
            }
          }
          post {
            always {
              dir("${BASE_DIR}"){
                archiveArtifacts(allowEmptyArchive: true, artifacts: "${E2E_DIR}/kibana.log")
              }
            }
          }
        }
        stage('UPTIME-UI') {
          // This stage requires a new agent
          agent { label 'linux && immutable' }
          options { skipDefaultCheckout() }
          when { expression { return env.RUN_UPTIME_E2E != "false" } }
          stages {
            stage('Prepare build context') {
              options { skipDefaultCheckout() }
              steps {
                pipelineManager([ cancelPreviousRunningBuilds: [ when: 'PR' ] ])
                deleteDir()
                gitCheckout(basedir: "${BASE_DIR}", githubNotifyFirstTimeContributor: false,
                            shallow: false, reference: "/var/lib/jenkins/.git-references/kibana.git")
              }
            }
            stage('Prepare Kibana') {
              options { skipDefaultCheckout() }
              environment {
                JENKINS_NODE_COOKIE = 'dontKillMe'
              }
              steps {
                notifyStatus(env.GITHUB_CHECK_UPTIME_UI, 'Preparing kibana', 'PENDING')
                dir("${BASE_DIR}"){
                  sh "${UPTIME_E2E_DIR}/ci/prepare_kibana.sh"
                }
              }
              post {
                unsuccessful {
                  notifyStatus(env.GITHUB_CHECK_UPTIME_UI, 'Kibana warm up failed', 'FAILURE')
                }
              }
            }
            stage('Smoke Tests'){
              options { skipDefaultCheckout() }
              steps{
                notifyTestStatus(env.GITHUB_CHECK_UPTIME_UI, 'Running smoke tests', 'PENDING')
                dir("${BASE_DIR}"){
                  sh "${UPTIME_E2E_DIR}/ci/run_e2e.sh"
                }
              }
              post {
                always {
                  dir("${UPTIME_E2E_DIR}"){
                    sh 'docker-compose logs > uptime-e2e-docker.log || true'
                    archiveArtifacts(allowEmptyArchive: true, artifacts: 'uptime-e2e-docker.log')
                  }
                  echo 'TBD: archive test output when the smoke tests generate junit output'
                }
                unsuccessful {
                  notifyTestStatus(env.GITHUB_CHECK_UPTIME_UI, 'Test failures', 'FAILURE')
                }
                success {
                  notifyTestStatus(env.GITHUB_CHECK_UPTIME_UI, 'Tests passed', 'SUCCESS')
                }
              }
            }
          }
          post {
            always {
              dir("${BASE_DIR}"){
                archiveArtifacts(allowEmptyArchive: true, artifacts: "${UPTIME_E2E_DIR}/kibana.log")
              }
            }
          }
        }
      }
    }
  }
  post {
    cleanup {
      notifyBuildResult(prComment: false, analyzeFlakey: false, shouldNotify: false)
    }
  }
}

def notifyStatus(String check, String description, String status) {
  withGithubStatus.notify(check, description, status, getBlueoceanTabURL('pipeline'))
}

def notifyTestStatus(String check, String description, String status) {
  withGithubStatus.notify(check, description, status, getBlueoceanTabURL('tests'))
}

def analyseBuildReasonForApmUI() {
  return shouldTriggerABuild(patterns: [ "^x-pack/plugins/apm/.*" ], team: ['apm-ui', 'uptime'])
}

def analyseBuildReasonForUptimeUI() {
  return shouldTriggerABuild(patterns: [ "^x-pack/plugins/uptime/.*" ], team: ['uptime'])
}

/**
* Filter when to run based on the below reasons:
*  - On a PRs when:
*    - There are changes related to the given subfolder
*      - only when the owners of those changes are members of the given GitHub teams
*  - On merges to branches when:
*    - There are changes related to the given subfolder
*  - FORCE parameter is set to true.
*/
def shouldTriggerABuild(Map args = [:]) {
  def patterns = args.patterns
  def team = args.team
  def updated = false
  dir("${BASE_DIR}"){
    updated = isGitRegionMatch(patterns: patterns)
  }
  if (isPR()) {
    def isMember = isMemberOf(user: env.CHANGE_AUTHOR, team: team)
    return (params.FORCE || (updated && isMember))
  } else {
    return (params.FORCE || apm_updated)
  }
}
