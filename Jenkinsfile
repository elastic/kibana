#!/bin/groovy

properties([durabilityHint('PERFORMANCE_OPTIMIZED')])

timeout(time: 180, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      parallel([
        // 'kibana-intake': jobRunner('kibana-intake'),
        // 'x-pack-intake': jobRunner('x-pack-intake'),
        // 'kibana-firefoxSmoke': jobRunner('kibana-firefoxSmoke'),
        'kibana-ciGroup1': jobRunner('kibana-ciGroup1'),
        // 'kibana-ciGroup2': jobRunner('kibana-ciGroup2'),
        // 'kibana-ciGroup3': jobRunner('kibana-ciGroup3'),
        // 'kibana-ciGroup4': jobRunner('kibana-ciGroup4'),
        // 'kibana-ciGroup5': jobRunner('kibana-ciGroup5'),
        // 'kibana-ciGroup6': jobRunner('kibana-ciGroup6'),
        // 'kibana-ciGroup7': jobRunner('kibana-ciGroup7'),
        // 'kibana-ciGroup8': jobRunner('kibana-ciGroup8'),
        // 'kibana-ciGroup9': jobRunner('kibana-ciGroup9'),
        // 'kibana-ciGroup10': jobRunner('kibana-ciGroup10'),
        // 'kibana-ciGroup11': jobRunner('kibana-ciGroup11'),
        // 'kibana-ciGroup12': jobRunner('kibana-ciGroup12'),
        // 'kibana-visualRegression': jobRunner('kibana-visualRegression'),

        // make sure all x-pack-ciGroups are listed in test/scripts/jenkins_xpack_ci_group.sh
        // 'x-pack-firefoxSmoke': jobRunner('x-pack-firefoxSmoke'),
        // 'x-pack-ciGroup1': jobRunner('x-pack-ciGroup1'),
        // 'x-pack-ciGroup2': jobRunner('x-pack-ciGroup2'),
        // 'x-pack-ciGroup3': jobRunner('x-pack-ciGroup3'),
        // 'x-pack-ciGroup4': jobRunner('x-pack-ciGroup4'),
        // 'x-pack-ciGroup5': jobRunner('x-pack-ciGroup5'),
        // 'x-pack-ciGroup6': jobRunner('x-pack-ciGroup6'),
        // 'x-pack-ciGroup7': jobRunner('x-pack-ciGroup7'),
        // 'x-pack-ciGroup8': jobRunner('x-pack-ciGroup8'),
        // 'x-pack-ciGroup9': jobRunner('x-pack-ciGroup9'),
        // 'x-pack-ciGroup10': jobRunner('x-pack-ciGroup10'),
        // 'x-pack-visualRegression': jobRunner('x-pack-visualRegression'),
      ])
    }
  }
}

def withWorker(name, closure) {
  node('linux && immutable') {
    closure()
  }
}

def jobRunner(name) {
  return {
    withEnv([
      "JOB=${name}",
      "CI=true",
      "HOME=${env.JENKINS_HOME}",
    ]) {
      withWorker(name) {
        catchError {
          checkout scm

          // scm is configured to check out to the ./kibana directory
          dir('kibana') {
            stage(name) {
              sh 'env' // TODO remove

              try {
                runbld('.ci/run.sh')
              } finally {
                uploadAllGcsArtifacts(name)
                publishJunit()
              }
            }
          }
        }

        sendMail()
      }
    }
  }
}

// TODO what should happen if GCS, Junit, or email publishing fails? Unstable build? Failed build?

def uploadGcsArtifact(jobName, pattern) {
  def storageLocation = "gs://kibana-ci-artifacts/jobs/pipeline-test/${BUILD_NUMBER}/${jobName}"

  googleStorageUpload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucket: storageLocation,
    pattern: pattern,
    sharedPublicly: true,
    showInline: true,
  )
}

def uploadAllGcsArtifacts(jobName) {
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
    uploadGcsArtifact(jobName, pattern)
  }
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
}

def sendMail() {
  step([
    $class: 'Mailer',
    notifyEveryUnstableBuild: true,
    recipients: 'infra-root+build@elastic.co',
    sendToIndividuals: false
  ])
}

def runbld(script) {
  sh '#!/usr/local/bin/runbld\n' + script
}

def bash(script) {
  sh "#!/bin/bash -x\n${script}"
}