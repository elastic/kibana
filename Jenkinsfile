#!/bin/groovy

properties([
  durabilityHint('PERFORMANCE_OPTIMIZED'),
])

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 180, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        catchError {
          parallel([
            'kibana-oss-agent-0': withWorkers('kibana-oss-tests-0', { buildOss() }, [
              'oss-ciGroup1-0': getOssCiGroupWorker(1),
              'oss-ciGroup1-1': getOssCiGroupWorker(1),
              'oss-ciGroup1-2': getOssCiGroupWorker(1),
              'oss-ciGroup1-3': getOssCiGroupWorker(1),
              'oss-ciGroup1-4': getOssCiGroupWorker(1),
              'oss-ciGroup1-5': getOssCiGroupWorker(1),
              'oss-ciGroup1-6': getOssCiGroupWorker(1),
              'oss-ciGroup1-7': getOssCiGroupWorker(1),
              'oss-ciGroup1-8': getOssCiGroupWorker(1),
              'oss-ciGroup1-9': getOssCiGroupWorker(1),
            ]),
            'kibana-oss-agent-1': withWorkers('kibana-oss-tests-1', { buildOss() }, [
              'oss-ciGroup1-10': getOssCiGroupWorker(1),
              'oss-ciGroup1-11': getOssCiGroupWorker(1),
              'oss-ciGroup1-12': getOssCiGroupWorker(1),
              'oss-ciGroup1-13': getOssCiGroupWorker(1),
              'oss-ciGroup1-14': getOssCiGroupWorker(1),
              'oss-ciGroup1-15': getOssCiGroupWorker(1),
              'oss-ciGroup1-16': getOssCiGroupWorker(1),
              'oss-ciGroup1-17': getOssCiGroupWorker(1),
              'oss-ciGroup1-18': getOssCiGroupWorker(1),
              'oss-ciGroup1-19': getOssCiGroupWorker(1),
            ]),
            'kibana-oss-agent-2': withWorkers('kibana-oss-tests-2', { buildOss() }, [
              'oss-ciGroup1-20': getOssCiGroupWorker(1),
              'oss-ciGroup1-21': getOssCiGroupWorker(1),
              'oss-ciGroup1-22': getOssCiGroupWorker(1),
              'oss-ciGroup1-23': getOssCiGroupWorker(1),
              'oss-ciGroup1-24': getOssCiGroupWorker(1),
              'oss-ciGroup1-25': getOssCiGroupWorker(1),
              'oss-ciGroup1-26': getOssCiGroupWorker(1),
              'oss-ciGroup1-27': getOssCiGroupWorker(1),
              'oss-ciGroup1-28': getOssCiGroupWorker(1),
              'oss-ciGroup1-29': getOssCiGroupWorker(1),
            ]),
            'kibana-oss-agent-3': withWorkers('kibana-oss-tests-3', { buildOss() }, [
              'oss-ciGroup1-30': getOssCiGroupWorker(1),
              'oss-ciGroup1-31': getOssCiGroupWorker(1),
              'oss-ciGroup1-32': getOssCiGroupWorker(1),
              'oss-ciGroup1-33': getOssCiGroupWorker(1),
              'oss-ciGroup1-34': getOssCiGroupWorker(1),
              'oss-ciGroup1-35': getOssCiGroupWorker(1),
              'oss-ciGroup1-36': getOssCiGroupWorker(1),
              'oss-ciGroup1-37': getOssCiGroupWorker(1),
              'oss-ciGroup1-38': getOssCiGroupWorker(1),
              'oss-ciGroup1-39': getOssCiGroupWorker(1),
            ]),
          ])
        }
        node('flyweight') {
          sendMail()
        }
      }
    }
  }
}

def withWorkers(name, preWorkerClosure = {}, workerClosures = [:]) {
  return {
    jobRunner('tests-xl') {
      try {
        doSetup()
        preWorkerClosure()

        def nextWorker = 1
        def worker = { workerClosure ->
          def workerNumber = nextWorker
          nextWorker++

          return {
            workerClosure(workerNumber)
          }
        }

        def workers = [:]
        workerClosures.each { workerName, workerClosure ->
          workers[workerName] = worker(workerClosure)
        }

        parallel(workers)
      } finally {
        catchError {
          uploadAllGcsArtifacts(name)
        }

        catchError {
          publishJunit()
        }
      }
    }
  }
}

def getPostBuildWorker(name, closure) {
  return { workerNumber ->
    def kibanaPort = "61${workerNumber}1"
    def esPort = "61${workerNumber}2"
    def esTransportPort = "61${workerNumber}3"

    withEnv([
      "CI_WORKER_NUMBER=${workerNumber}",
      "TEST_KIBANA_HOST=localhost",
      "TEST_KIBANA_PORT=${kibanaPort}",
      "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
      "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
      "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
      "IS_PIPELINE_JOB=1",
    ]) {
      closure()
    }
  }
}

def getOssCiGroupWorker(ciGroup) {
  return getPostBuildWorker("ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=kibana-ciGroup${ciGroup}",
    ]) {
      runbld "./test/scripts/jenkins_ci_group.sh"
    }
  })
}

def getXpackCiGroupWorker(ciGroup) {
  return getPostBuildWorker("xpack-ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=xpack-kibana-ciGroup${ciGroup}",
    ]) {
      runbld "./test/scripts/jenkins_xpack_ci_group.sh"
    }
  })
}

def legacyJobRunner(name) {
  return {
    parallel([
      "${name}": {
        withEnv([
          "JOB=${name}",
        ]) {
          jobRunner('linux && immutable') {
            try {
              runbld '.ci/run.sh'
            } finally {
              catchError {
                uploadAllGcsArtifacts(name)
              }
              catchError {
                publishJunit()
              }
            }
          }
        }
      }
    ])
  }
}

def jobRunner(label, closure) {
  node(label) {
    def scmVars = checkout scm

    withEnv([
      "CI=true",
      "HOME=${env.JENKINS_HOME}",
      "PR_SOURCE_BRANCH=${env.ghprbSourceBranch}",
      "PR_TARGET_BRANCH=${env.ghprbTargetBranch}",
      "PR_AUTHOR=${env.ghprbPullAuthorLogin}",
      "TEST_BROWSER_HEADLESS=1",
      "GIT_BRANCH=${scmVars.GIT_BRANCH}",
    ]) {
      withCredentials([
        string(credentialsId: 'vault-addr', variable: 'VAULT_ADDR'),
        string(credentialsId: 'vault-role-id', variable: 'VAULT_ROLE_ID'),
        string(credentialsId: 'vault-secret-id', variable: 'VAULT_SECRET_ID'),
      ]) {
        // scm is configured to check out to the ./kibana directory
        dir('kibana') {
          closure()
        }
      }
    }
  }
}

// TODO what should happen if GCS, Junit, or email publishing fails? Unstable build? Failed build?

def uploadGcsArtifact(workerName, pattern) {
  def storageLocation = "gs://kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/${workerName}" // TODO
  // def storageLocation = "gs://kibana-pipeline-testing/jobs/pipeline-test/${BUILD_NUMBER}/${workerName}"

  googleStorageUpload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucket: storageLocation,
    pattern: pattern,
    sharedPublicly: true,
    showInline: true,
  )
}

def uploadAllGcsArtifacts(workerName) {
  def ARTIFACT_PATTERNS = [
    'target/kibana-*',
    'target/junit/**/*',
    'test/**/screenshots/**/*.png',
    'test/functional/failure_debug/html/*.html',
    'x-pack/test/**/screenshots/**/*.png',
    'x-pack/test/functional/failure_debug/html/*.html',
    'x-pack/test/functional/apps/reporting/reports/session/*.pdf',
  ]

  ARTIFACT_PATTERNS.each { pattern ->
    uploadGcsArtifact(workerName, pattern)
  }
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
}

def sendMail() {
  sendInfraMail()
  sendKibanaMail()
}

def sendInfraMail() {
  catchError {
    step([
      $class: 'Mailer',
      notifyEveryUnstableBuild: true,
      recipients: 'infra-root+build@elastic.co',
      sendToIndividuals: false
    ])
  }
}

def sendKibanaMail() {
  catchError {
    if(params.NOTIFY_ON_FAILURE && currentBuild.result != 'SUCCESS' && currentBuild.result != 'ABORTED') {
      emailext(
        // to: 'build-kibana@elastic.co',
        to: 'brian.seeders@elastic.co', // TODO switch this out after testing
        subject: "${env.PROJECT_NAME} - Build # ${env.BUILD_NUMBER} - ${currentBuild.result}",
        body: '${SCRIPT,template="groovy-html.template"}',
        mimeType: 'text/html',
      )
    }
  }
}

def runbld(script) {
  sh '#!/usr/local/bin/runbld\n' + script
}

def bash(script) {
  sh "#!/bin/bash -x\n${script}"
}

def doSetup() {
  runbld "./test/scripts/jenkins_setup.sh"
}

def buildOss() {
  runbld "./test/scripts/jenkins_build_kibana.sh"
}

def buildXpack() {
  runbld "./test/scripts/jenkins_xpack_build_kibana.sh"
}
