#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

def ES_BRANCH = '6.8'

def PROMOTE_WITHOUT_VERIFY = false

timeout(time: 120, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      slackNotifications.onFailure {
        node('docker && tests-l') {
          catchError {
            def VERSION
            def SNAPSHOT_ID
            def DESTINATION

            def scmVars = checkoutEs(ES_BRANCH)
            def GIT_COMMIT = scmVars.GIT_COMMIT
            def GIT_COMMIT_SHORT = sh(script: "git rev-parse --short ${GIT_COMMIT}", returnStdout: true).trim()

            buildArchives('to-archive')
          }
        }
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

def buildArchives(destination) {
  def props = readProperties file: '.ci/java-versions.properties'
  withEnv([
    // Select the correct JDK for this branch
    "PATH=/var/lib/jenkins/.java/${props.ES_BUILD_JAVA}/bin:${env.PATH}",
    "JAVA_HOME=/var/lib/jenkins/.java/${props.ES_BUILD_JAVA}",

    "HOME=/var/lib/jenkins", // A Vagrant error is thrown if HOME is missing

    // These Jenkins env vars trigger some automation in the elasticsearch repo that we don't want
    "BUILD_NUMBER=",
    "JENKINS_URL=",
    "BUILD_URL=",
    "JOB_NAME=",
    "NODE_NAME=",
  ]) {
    sh """
      ./gradlew -Dbuild.docker=true assemble --parallel
      mkdir -p ${destination}
      find distribution/archives -type f \\( -name 'elasticsearch-*.tar.gz' -o -name 'elasticsearch-*.zip' \\) -not -path *no-jdk* -exec cp {} ${destination} \\;
      docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 bash -c 'docker save docker.elastic.co/elasticsearch/elasticsearch:\${0} | gzip > ${destination}/elasticsearch-\${0}-docker-image.tar.gz'
    """
  }
}
