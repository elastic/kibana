#!/bin/groovy

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 180, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        catchError {
          parallel([
            'intake-agent': legacyJobRunner('intake'),
            'firefox-smoke-agent': legacyJobRunner('firefoxSmoke'),
            'kibana-oss-agent': withWorkers('kibana-oss-tests', { buildOss() }, [
              'oss-ciGroup1': getOssCiGroupWorker(1),
              'oss-ciGroup2': getOssCiGroupWorker(2),
              'oss-ciGroup3': getOssCiGroupWorker(3),
              'oss-ciGroup4': getOssCiGroupWorker(4),
              'oss-ciGroup5': getOssCiGroupWorker(5),
              'oss-ciGroup6': getOssCiGroupWorker(6),
              // 'oss-ciGroup7': getOssCiGroupWorker(7),
              // 'oss-ciGroup8': getOssCiGroupWorker(8),
              // 'oss-ciGroup9': getOssCiGroupWorker(9),
              // 'oss-ciGroup10': getOssCiGroupWorker(10),
              // 'oss-ciGroup11': getOssCiGroupWorker(11),
              // 'oss-ciGroup12': getOssCiGroupWorker(12),
              // 'oss-visualRegression': getPostBuildWorker('visualRegression', { runbld './test/scripts/jenkins_visual_regression.sh' }),
              // 'oss-firefoxSmoke': getPostBuildWorker('firefoxSmoke', { runbld './test/scripts/jenkins_firefox_smoke.sh' }),
            ]),
            'kibana-xpack-agent': withWorkers('kibana-xpack-tests', { buildXpack() }, [
              'xpack-ciGroup1': getXpackCiGroupWorker(1),
              'xpack-ciGroup2': getXpackCiGroupWorker(2),
              'xpack-ciGroup3': getXpackCiGroupWorker(3),
              'xpack-ciGroup4': getXpackCiGroupWorker(4),
              'xpack-ciGroup5': getXpackCiGroupWorker(5),
              // 'xpack-ciGroup6': getXpackCiGroupWorker(6),
              // 'xpack-ciGroup7': getXpackCiGroupWorker(7),
              // 'xpack-ciGroup8': getXpackCiGroupWorker(8),
              // 'xpack-ciGroup9': getXpackCiGroupWorker(9),
              // 'xpack-ciGroup10': getXpackCiGroupWorker(10),
              // 'xpack-firefoxSmoke': getPostBuildWorker('xpack-firefoxSmoke', { runbld './test/scripts/jenkins_xpack_firefox_smoke.sh' }),
              // 'xpack-visualRegression': getPostBuildWorker('xpack-visualRegression', { runbld './test/scripts/jenkins_xpack_visual_regression.sh' }),
            ]),
          ])
        }
        node('flyweight') {
          // If the build doesn't have a result set by this point, there haven't been any errors and it can be marked as a success
          // The e-mail plugin for the infra e-mail depends upon this being set
          currentBuild.result = currentBuild.result ?: 'SUCCESS'

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
          runbldJunit()
        }

        catchError {
          publishJunit()
        }

        catchError {
          runErrorReporter()
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
              runbld('.ci/run.sh', true)
            } finally {
              catchError {
                uploadAllGcsArtifacts(name)
              }
              catchError {
                publishJunit()
              }
              catchError {
                runErrorReporter()
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
      "IS_PIPELINE_JOB=1",
      "HOME=${env.JENKINS_HOME}",
      "PR_SOURCE_BRANCH=${env.ghprbSourceBranch ?: ''}",
      "PR_TARGET_BRANCH=${env.ghprbTargetBranch ?: ''}",
      "PR_AUTHOR=${env.ghprbPullAuthorLogin ?: ''}",
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
        to: 'build-kibana@elastic.co',
        subject: "${env.JOB_NAME} - Build # ${env.BUILD_NUMBER} - ${currentBuild.result}",
        body: '${SCRIPT,template="groovy-html.template"}',
        mimeType: 'text/html',
      )
    }
  }
}

def runbld(script, enableJunitProcessing = false) {
  def extraConfig = enableJunitProcessing ? "" : "--config ${env.WORKSPACE}/kibana/.ci/runbld_no_junit.yml"

  sh "/usr/local/bin/runbld -d '${pwd()}' ${extraConfig} ${script}"
}

def runbldJunit() {
  sh "/usr/local/bin/runbld -d '${pwd()}' ${env.WORKSPACE}/kibana/test/scripts/jenkins_runbld_junit.sh"
}

def bash(script) {
  sh "#!/bin/bash\n${script}"
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

def runErrorReporter() {
  bash """
    source src/dev/ci_setup/setup_env.sh
    node src/dev/failed_tests/cli
  """
}
