#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent none 
  environment {
    BASE_DIR = "."
    CI = true
    HOME = "${JENKINS_HOME}"
    LC_ALL = "en_US.UTF-8"
    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
  }
  stages {
    // stage('Checkout') {
    //   agent { label 'master || immutable || linux' }
    //   steps {
    //     stash allowEmpty: true, name: 'source', useDefaultExcludes: true, excludes: 'node_modules/@elastic/nodegit/vendor/libgit2/tests/**'
    //   }
    // }
    stage('Setup and Build OSS') {
      agent { label 'linux || immutable' } // Not on the master lightweight executor:   
      // options { skipDefaultCheckout() }
      steps {
        // deleteDir()
        // unstash 'source'
        dir("${env.BASE_DIR}"){
          // Runs src/dev/ci_setup/extract_bootstrap_cache.sh, src/dev/ci_setup/setup.sh, and src/dev/ci_setup/checkout_sibling_es.sh
          // setup.sh bootstraps the app, so we can stash from here
          sh './.ci/run.sh' 
          sh 'du -hcs node_modules' // How big is node_modules?
        }
        stash allowEmpty: true, name: 'oss-source', useDefaultExcludes: true, excludes: 'node_modules/@elastic/nodegit/vendor/libgit2/tests/**'
      }
    }
    stage('kibana-intake') {
      agent { label 'linux || immutable' } 
      options { skipDefaultCheckout() }
      steps {
        deleteDir()
        unstash 'oss-source'
        // sh './test/scripts/jenkins_unit.sh'
      }
    }











    stage('Component Integration Tests') {
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Functional Tests') {
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Finish') {
      steps {
        sh 'echo "Not implemented yet"'
        // sh 'env > env.txt' 
        // script {
        //   for (String x: readFile('env.txt').split("\r?\n")) {
        //     println "# ENV VAR: ${x}"
        //   }
        // } 
      }
    }
  }
}
