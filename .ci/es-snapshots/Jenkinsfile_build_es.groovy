#!/bin/groovy

library 'kibana-pipeline-library'
// kibanaLibrary.load()

def BRANCH = params.BRANCH ?: 'master' // TODO

if (!BRANCH) {
  error "Parameter 'BRANCH' must be specified."
}

timeout(time: 120, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      node('linux && immutable') {
        def scmVars = checkoutEs('master')
        print scmVars
        def GIT_COMMIT = scmVars.GIT_COMMIT
        def GIT_COMMIT_SHORT = sh(script: "git rev-parse --short ${GIT_COMMIT}", returnStdout: true).trim()

        sh 'rm -rf to-archive || true' // TODO remove
        buildArchives('to-archive')

        dir('to-archive') {
          def now = new Date()
          def date = now.format("yyyyMMdd-HHmmss")

          def version
          def destination

          def filesRaw = sh(script: "ls -1", returnStdout: true).trim()
          def files = filesRaw.split("\n").collect { filename ->
            // elasticsearch-oss-8.0.0-SNAPSHOT-linux-x86_64.tar.gz
            // elasticsearch-8.0.0-SNAPSHOT-linux-x86_64.tar.gz
            def parts = filename.replace("elasticsearch-oss", "oss").split("-")

            version = version ?: parts[1]
            destination = destination ?: "${version}/archives/${date}_${GIT_COMMIT_SHORT}"

            return [
              filename: filename,
              checksum: filename + '.sha512',
              url: "https://storage.googleapis.com/kibana-ci-es-snapshots/${destination}/${filename}".toString(),
              version: parts[1],
              platform: parts.size() >= 5 ? parts[3] : '',
              architecture: parts.size() >= 5 ? parts[4].split('\\.')[0] : '',
              license: parts[0] == 'oss' ? 'oss' : 'default',
            ]
          }

          sh 'find * -exec bash -c "shasum -a 512 {} > {}.sha512" \\;'

          def manifest = [
            bucket: "kibana-ci-es-snapshots/${destination}".toString(),
            branch: BRANCH,
            sha: GIT_COMMIT,
            sha_short: GIT_COMMIT_SHORT,
            version: version,
            generated: now.format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC")),
            archives: files,
          ]
          def manifestJson = toJSON(manifest).toString()
          writeFile file: 'manifest.json', text: manifestJson

          upload(destination, '*.*')

          sh "cp manifest.json manifest-latest.json"
          upload(version, 'manifest-latest.json')
        }
      }
    }
  }
}

def checkoutEs(branch) {
  // TODO wrap in a new retryWithDelay(15, 8){}
  return checkout([
    $class: 'GitSCM',
    branches: [[name: branch]],
    doGenerateSubmoduleConfigurations: false,
    extensions: [
      [
        $class: 'CloneOption',
        noTags: false,
        reference: '/var/lib/jenkins/.git-references/elasticsearch.git',
        shallow: true
      ]
    ],
    submoduleCfg: [],
    userRemoteConfigs: [[
      credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba',
      name: 'origin',
      refspec: '+refs/heads/master:refs/remotes/origin/master',
      url: 'git@github.com:elastic/elasticsearch',
    ]],
  ])
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
  withEnv([
      "PATH=/var/lib/jenkins/.java/openjdk13/bin:${env.PATH}", // Probably won't even need this if this gets wrapped in runbld
  ]) {
    sh """
      ./gradlew -p distribution/archives assemble --parallel
      mkdir -p ${destination}
      find distribution/archives -type f \\( -name 'elasticsearch-*-*.tar.gz' -o -name 'elasticsearch-*-*.zip' \\) -not -path *no-jdk* -exec cp {} ${destination} \\;
    """
  }
}
