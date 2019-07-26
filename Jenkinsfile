#!/usr/bin/env groovy
import groovy.json.JsonSlurper

// Licensed to Elasticsearch B.V. under one or more contributor
// license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright
// ownership. Elasticsearch B.V. licenses this file to you under
// the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

library identifier: 'apm@current', retriever: modernSCM(
  [$class       : 'GitSCMSource',
   remote       : 'git@github.com:elastic/apm-pipeline-library.git',
   credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba'])

pipeline {
  //  agent { label 'linux && immutable' }
  agent any
  environment {
    CI_DIR = "./.ci"
    GROOVY_SRC = "${CI_DIR}/src/groovy"
    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins
    MAIN_CACHE_DIR = "${JENKINS_HOME}/.kibana" // /var/lib/jenkins/.kibana
    BOOTSTRAP_CACHE_DIR = "${MAIN_CACHE_DIR}/bootstrap_cache" // /var/lib/jenkins/.kibana/bootstrap_cache
    WORKSPACE_DIR = "${JENKINS_HOME}/workspace" // /var/lib/jenkins/workspace
    WORKSPACE_CACHE_DIR = "${MAIN_CACHE_DIR}/workspace_cache" // /var/lib/jenkins/.kibana/workspace_cache
    WORKSPACE_CACHE_NAME_FMT = "${JOB_NAME}-%s-${BUILD_ID}.tgz"

    BASE_DIR = "src/github.com/elastic/kibana"
    ES_BASE_DIR = "src/github.com/elastic/elasticsearch"
    JOB_GIT_CREDENTIALS = "f6c7695a-671e-4f4f-a331-acdce44ff9ba"
    FORCE_COLOR = "2"
    GIT_URL = "git@github.com:elastic/kibana.git"
    ES_GIT_URL = "git@github.com:elastic/elasticsearch.git"
    TEST_BROWSER_HEADLESS = "${params.TEST_BROWSER_HEADLESS}"
    TEST_ES_FROM = "${params.TEST_ES_FROM}"
  }
  options {
    //timeout(time: 5, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '3', artifactNumToKeepStr: '2', daysToKeepStr: '30'))
    timestamps()
    preserveStashes()
    //  ansiColor('xterm')
    disableResume()
    durabilityHint('PERFORMANCE_OPTIMIZED')
  }
  parameters {
    string(name: 'branch_specifier', defaultValue: "qa-jenkinsfile-experiment", description: "the Git branch specifier to build (branchName, tagName, commitId, etc.)")
    string(name: 'ES_VERSION', defaultValue: "master", description: "Elastic Stack Git branch/tag to use")
    string(name: 'TEST_BROWSER_HEADLESS', defaultValue: "1", description: "Use headless browser.")
    string(name: 'TEST_ES_FROM', defaultValue: "source", description: "Test from sources.")
    booleanParam(name: 'Run_As_Master_Branch', defaultValue: false, description: 'Allow to run any steps on a PR, some steps normally only run on master branch.')
    booleanParam(name: 'build_oss_ci', defaultValue: false, description: 'Build OSS')
    booleanParam(name: 'build_no_oss_ci', defaultValue: false, description: 'Build NO OSS')
    booleanParam(name: 'intake_ci', defaultValue: false, description: 'Intake Tests')
    booleanParam(name: 'ciGroup_ci', defaultValue: false, description: 'Group Tests')
    booleanParam(name: 'x_pack_intake_ci', defaultValue: false, description: 'X-Pack intake Tests')
    booleanParam(name: 'x_pack_ciGroup_ci', defaultValue: false, description: 'X-Pack Group Tests')
  }
  stages {
    /**
     Checkout the code and stash it, to use it on other stages.
     */
    stage('Initializing') {
      agent { label 'linux || immutable' }
//      agent any
      environment {
        HOME = "${env.WORKSPACE}"
      }
      stages {
        // stage('Checkout') {
        //   steps {
        //     checkoutES()
        //    checkoutKibana()
        //   }
        // }
        stage('Quick Test') {
          steps {
            quickTest()
          }
        }
      }
    }
  }
}

def checkoutKibana() {
  useCache('source'){
    dir("${BASE_DIR}"){
      checkout([$class: 'GitSCM', branches: [[name: params.branch_specifier]],
        userRemoteConfigs: [[credentialsId: "${JOB_GIT_CREDENTIALS}", url: "${GIT_URL}"]]])
      printPwd()
      stash allowEmpty: true, name: 'source', includes: "${BASE_DIR}/.git,node/**", excludes: ".git", useDefaultExcludes: false
    }
  }

  dir("${BASE_DIR}") {
    def packageJson = new JsonSlurper().parseText("${'cat package.json'.execute().text}".toString())
    env.NODE_VERSION = packageJson.engines.node
    env.YARN_VERSION = packageJson.engines.yarn
  }

  installNodeJs("${env.NODE_VERSION}", ["yarn@${env.YARN_VERSION}"])

  dir("${BASE_DIR}") {
    def yarnBinPath = sh(script: 'yarn bin', returnStdout: true)
    env.PATH = "${env.PATH}:${yarnBinPath}"
  }

  def isCacheUsed = useCache('cache') {
    firstTime = true
    dir("${BASE_DIR}") {
      sh 'yarn kbn bootstrap'
    }
    stash allowEmpty: true, name: 'cache',
      includes: "${BASE_DIR}/node_modules/**,${BASE_DIR}/optimize/**,${BASE_DIR}/target/**,${BASE_DIR}/packages/**,${BASE_DIR}/x-pack,${BASE_DIR}/test",
      useDefaultExcludes: false
  }
  if (isCacheUsed) {
    dir("${BASE_DIR}") {
      sh 'yarn kbn bootstrap'
    }
  }
}
def printPwd(){
  sh 'echo "### pwd: $(pwd)"'
}
/**
 Get Elasticsearch sources, it uses stash as cache (It used to lol).
 */
def checkoutES(){
  useCache('es-source'){
    dir("${ES_BASE_DIR}"){
      checkout([$class: 'GitSCM', branches: [[name: "${params.ES_VERSION}"]],
        doGenerateSubmoduleConfigurations: false,
        extensions: [[$class   : 'CloneOption',
          depth    : 1,
          noTags   : false,
          reference: "/var/lib/jenkins/.git-references/elasticsearch.git",
          shallow  : true
        ]],
        submoduleCfg: [],
        userRemoteConfigs: [[credentialsId: "${JOB_GIT_CREDENTIALS}",
        url: "${ES_GIT_URL}"]]])
      sh 'pwd'
      stash allowEmpty: true, name: 'es-source', includes: "${ES_BASE_DIR}/**", excludes: ".git", useDefaultExcludes: false
    }
  }
}
/**
 Some quick Test to run before anything else.
 */
def quickTest(){
  dir("${BASE_DIR}") {
    sh 'yarn tslint x-pack/plugins/apm/**/*.{ts,tsx} --fix'
    sh 'cd x-pack/plugins/apm && yarn tsc --noEmit'
    sh 'cd x-pack && node ./scripts/jest.js plugins/apm'
  }
}
/**
 install NodeJs, it uses stash as cache.

 see how to we can grab the cache from ~/.npm/_cacache
 */
def installNodeJs(nodeVersion, pakages = null) {
  nodeEnviromentVars(nodeVersion)
  useCache('nodeJs') {
    sh label: 'Install Node.js', script: """#!/bin/bash
    set -euxo pipefail
    NODE_URL="https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.gz"
    mkdir -p "${NODE_DIR}"
    curl -sL \${NODE_URL} | tar -xz -C "${NODE_DIR}" --strip-components=1
    node --version
    npm config set prefix "${NODE_DIR}"
    npm config list
    """
    def cmd = "echo 'Installing aditional packages'\n"
    pakages?.each { pkg ->
      cmd += "npm install -g ${pkg}\n"
    }
    sh label: 'Install packages', script: """#!/bin/bash
    set -euxo pipefail
    ${cmd}
    """
    stash allowEmpty: true, name: 'nodeJs', includes: "node/**", useDefaultExcludes: false
  }
}
/**
 unstash the stash passed as parameter or execute the block code passed.
 This works as a cache that make the retrieve process only once, the rest of times
 unstash the stuff.
 */
def useCache(String name, Closure body) {
  def isCacheUsed = false
  try {
    unstash name
    isCacheUsed = true
  } catch (error) {
    body()
    currentBuild.result = "SUCCESS"
  }
  return isCacheUsed
}
/**
  Define NodeJs environment variables.
*/
def nodeEnviromentVars(nodeVersion){
  /** TODO this enviroment variables could change on diferent type of agents, so maybe it is better to move then to the stage*/
  if(env.ORG_PATH == null){
    env.ORG_PATH = env.PATH
  }
  env.NODE_DIR="${WORKSPACE}/node/${nodeVersion}"
  env.NODE_BIN="${NODE_DIR}/bin"
  env.PATH="${NODE_BIN}:${WORKSPACE}/${BASE_DIR}/node_modules/.bin:${NODE_DIR}/lib/node_modules/yarn/bin:${ORG_PATH}"
  sh 'export'
}
