#!/bin/groovy

env.GIT_TRACE = '1'
env.GIT_CURL_VERBOSE = '1'

def NUMBER_OF_NODES = 5
def CLONES_PER_NODE = 2

def work = [:]
for(def i = 0; i < NUMBER_OF_NODES; i++) {
  work["node-${i}"] = {
    node('linux && immutable') {
      def innerWork = [:]
      for(def j = 0; j < CLONES_PER_NODE; j++) {
        def x = j
        innerWork["work-${x}"] = {
          dir("dir-${x}") {
            doIt()
          }
        }
      }
      parallel(innerWork)
    }
  }
}

parallel(work)

def doIt() {
  def hadError = false

  for(def i = 0; i < 100; i++) {
    try {
      timeout(time: 3, unit: 'MINUTES') {
        // checkout scm
        gitCheckout()
      }
      sleep 30
    } catch(ex) {
      hadError = true
      catchError {
        sh 'curl --verbose --connect-timeout 5 https://github.com/elastic/kibana'
      }
      catchError {
        throw ex
      }
    }

    catchError {
      sh 'rm -rf kibana'
    }
  }

  if (hadError) {
    input("Waiting...")
  }
}

def gitCheckout() {
  checkout(
    [
      $class: 'GitSCM',
      branches: 'master',
      doGenerateSubmoduleConfigurations: false,
      extensions: [
        [
          $class: 'CloneOption',
          noTags: false,
          reference: '/var/lib/jenkins/.git-references/kibana.git',
          shallow: false
        ]
      ],
      submoduleCfg: [],
      userRemoteConfigs: [[
        credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba',
        name: 'origin',
        refspec: 'refs/heads/master',
        url: 'https://github.com/elastic/kibana.git'
      ]],
    ]
  )
}
