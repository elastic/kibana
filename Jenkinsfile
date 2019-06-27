#!/usr/bin/env groovy

pipeline {
  agent none 
  environment {
    BASE_DIR = "."
    CI = true
    HOME = "${JENKINS_HOME}"
    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
  }
  stages {
    stage('bootstrap') {
      environment {
        STAGE = "bootstrap"
      }
      agent { label any } 
      steps {
        dir("${env.BASE_DIR}"){
          sh '''#!/usr/local/bin/runbld

            set -euo pipefail
            source /usr/local/bin/bash_standard_lib.sh

            set +x  # ENABLE'PRINT-ALL-COMMANDS' mode in bash.

            # export after define to avoid https://github.com/koalaman/shellcheck/wiki/SC2155
            VAULT_TOKEN=$(retry 5 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
            export VAULT_TOKEN

            # Set GITHUB_TOKEN for reporting test failures
            GITHUB_TOKEN=$(retry 5 vault read -field=github_token secret/kibana-issues/dev/kibanamachine)
            export GITHUB_TOKEN

            KIBANA_CI_REPORTER_KEY=$(retry 5 vault read -field=value secret/kibana-issues/dev/kibanamachine-reporter)
            export KIBANA_CI_REPORTER_KEY

            PERCY_TOKEN=$(retry 5 vault read -field=value secret/kibana-issues/dev/percy)
            export PERCY_TOKEN

            unset VAULT_ROLE_ID VAULT_SECRET_ID VAULT_TOKEN
            set -x # DISABLE 'PRINT-ALL-COMMANDS' mode in bash.
            '''
        }
      }
    }
    stage('kibana-intake') {
      agent { label 'linux || immutable' } 
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        // sh './test/scripts/jenkins_unit.sh'
        sh 'echo "Download workspace cache"'
      }
    }











    stage('Component Integration Tests') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Functional Tests') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Finish') {
      agent { label 'linux || immutable' } 
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
  }
}
def dumpEnv = {
  sh 'env > env.txt' 
  script {
    for (String x: readFile('env.txt').split("\r?\n")) {
      println "# ENV VAR: ${x}"
    }
  }   
  // Cleanup
  sh 'rm env.txt' 
}