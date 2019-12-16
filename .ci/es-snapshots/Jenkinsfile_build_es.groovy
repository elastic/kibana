#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

def BRANCH = params.BRANCH ?: 'master' // TODO
BRANCH = BRANCH != 'master' ? BRANCH : 'c1d075a7dab901bc3c80dec55ef74cc0e64b87b9'; // Last known working 8.0.0 version, TODO: Remove once a verified snapshot exists

if (!BRANCH) {
  error "Parameter 'BRANCH' must be specified."
}

timeout(time: 120, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      node('linux && immutable') {
        catchError {
          def VERSION
          def SNAPSHOT_ID
          def DESTINATION

          def scmVars = checkoutEs(BRANCH)
          def GIT_COMMIT = scmVars.GIT_COMMIT
          def GIT_COMMIT_SHORT = sh(script: "git rev-parse --short ${GIT_COMMIT}", returnStdout: true).trim()

          sh 'rm -rf to-archive || true' // TODO remove
          buildArchives('to-archive')

          dir('to-archive') {
            def now = new Date()
            def date = now.format("yyyyMMdd-HHmmss")

            def filesRaw = sh(script: "ls -1", returnStdout: true).trim()
            def files = filesRaw.split("\n").collect { filename ->
              // elasticsearch-oss-8.0.0-SNAPSHOT-linux-x86_64.tar.gz
              // elasticsearch-8.0.0-SNAPSHOT-linux-x86_64.tar.gz
              def parts = filename.replace("elasticsearch-oss", "oss").split("-")

              VERSION = VERSION ?: parts[1]
              SNAPSHOT_ID = SNAPSHOT_ID ?: "${date}_${GIT_COMMIT_SHORT}"
              DESTINATION = DESTINATION ?: "${VERSION}/archives/${SNAPSHOT_ID}"

              return [
                filename: filename,
                checksum: filename + '.sha512',
                url: "https://storage.googleapis.com/kibana-ci-es-snapshots/${DESTINATION}/${filename}".toString(),
                version: parts[1],
                platform: parts.size() >= 5 ? parts[3] : '',
                architecture: parts.size() >= 5 ? parts[4].split('\\.')[0] : '',
                license: parts[0] == 'oss' ? 'oss' : 'default',
              ]
            }

            sh 'find * -exec bash -c "shasum -a 512 {} > {}.sha512" \\;'

            def manifest = [
              bucket: "kibana-ci-es-snapshots/${DESTINATION}".toString(),
              branch: BRANCH,
              sha: GIT_COMMIT,
              sha_short: GIT_COMMIT_SHORT,
              version: VERSION,
              generated: now.format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC")),
              archives: files,
            ]
            def manifestJson = toJSON(manifest).toString()
            writeFile file: 'manifest.json', text: manifestJson

            upload(DESTINATION, '*.*')

            sh "cp manifest.json manifest-latest.json"
            upload(VERSION, 'manifest-latest.json')
          }

          build(
            propagate: false,
            wait: false,
            job: 'es-snapshot-verification',
            parameters: [
              string(name: 'BRANCH', value: 'master'), // TODO
              string(name: 'SNAPSHOT_VERSION', value: VERSION),
              string(name: 'SNAPSHOT_ID', value: SNAPSHOT_ID),
            ]
          )
        }

        kibanaPipeline.sendMail()
      }
    }
  }
}

def checkoutEs(branch) {
  retryWithDelay(8, 15) {
    return checkout([
      $class: 'GitSCM',
      branches: [[name: branch]],
      doGenerateSubmoduleConfigurations: false,
      extensions: [],
      submoduleCfg: [],
      userRemoteConfigs: [[
        credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba',
        url: 'git@github.com:elastic/elasticsearch',
      ]],
    ])
  }
}

def upload(destination, pattern) {
  return googleStorageUpload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucket: "gs://kibana-ci-es-snapshots/${destination}",
    pattern: pattern,
    sharedPublicly: false,
    showInline: false,
  )
}

def buildArchives(destination) {
  def props = readProperties file: '.ci/java-versions.properties'
  withEnv([
      "PATH=/var/lib/jenkins/.java/${props.ES_BUILD_JAVA}/bin:${env.PATH}", // Probably won't even need this if this gets wrapped in runbld

      // these jenkins env vars trigger some automation in ES that we don't want
      "BUILD_NUMBER=",
      "JENKINS_URL=",
      "BUILD_URL=",
      "JOB_NAME=",
      "NODE_NAME=",
  ]) {
    sh """
      ./gradlew -p distribution/archives assemble --parallel
      mkdir -p ${destination}
      find distribution/archives -type f \\( -name 'elasticsearch-*-*.tar.gz' -o -name 'elasticsearch-*-*.zip' \\) -not -path *no-jdk* -exec cp {} ${destination} \\;
    """
  }
}
