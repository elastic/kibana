#!/bin/groovy

// This job effectively has two SCM configurations:
// one for kibana, used to check out this Jenkinsfile (which means it's the job's main SCM configuration), as well as kick-off the downstream verification job
// one for elasticsearch, used to check out the elasticsearch source before building it

// There are two parameters that drive which branch is checked out for each of these, but they will typically be the same
// 'branch_specifier' is for kibana / the job itself
// ES_BRANCH is for elasticsearch

library 'kibana-pipeline-library'
kibanaLibrary.load()

def ES_BRANCH = 'master'

if (!ES_BRANCH) {
  error "Parameter 'ES_BRANCH' must be specified."
}

currentBuild.displayName += " - ${ES_BRANCH}"
currentBuild.description = "ES: ${ES_BRANCH}<br />Kibana: ${params.branch_specifier}"

def PROMOTE_WITHOUT_VERIFY = !!params.PROMOTE_WITHOUT_VERIFICATION

timeout(time: 120, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      slackNotifications.onFailure {
        node(workers.label('l')) {
          catchErrors {
            error "This is a test"
          }

          kibanaPipeline.sendMail()
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
      find distribution -type f \\( -name 'elasticsearch-*-*-*-*.tar.gz' -o -name 'elasticsearch-*-*-*-*.zip' \\) -not -path *no-jdk* -not -path *build-context* -exec cp {} ${destination} \\;
      docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 bash -c 'docker save docker.elastic.co/elasticsearch/elasticsearch:\${0} | gzip > ${destination}/elasticsearch-\${0}-docker-image.tar.gz'
    """
  }
}
