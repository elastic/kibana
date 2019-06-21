#!/usr/bin/env groovy
// @Library('apm@current') _

pipeline {
  agent any
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
    stage('Kickoff') {
      agent { label 'master || immutable' }
      steps {
        // sh 'env > env.txt' 
        // script {
        //   for (String x: readFile('env.txt').split("\r?\n")) {
        //     println "# ENV VAR: ${x}"
        //   }
        // } 
        stash allowEmpty: true, name: 'source-before-install', useDefaultExcludes: true, excludes: 'node_modules/@elastic/nodegit/vendor/libgit2/tests/**'
      }
    }
    stage('Build OSS') {
      agent { label 'linux || immutable' }
      steps {
        unstash 'source-before-install'
        dir("${env.BASE_DIR}"){
          sh './.ci/run.sh'
        }
        stash allowEmpty: true, name: 'source', useDefaultExcludes: true, excludes: 'node_modules/@elastic/nodegit/vendor/libgit2/tests/**  '
      }
    }
    stage('Static Analysis') {
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Unit Test') {
      steps {
        sh 'echo "Not implemented yet"'
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
      }
    }
  }
}
