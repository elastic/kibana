#!/usr/bin/env groovy

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
  [$class: 'GitSCMSource',
   remote: 'git@github.com:elastic/apm-pipeline-library.git',
   credentialsId: 'f6c7695a-671e-4f4f-a331-acdce44ff9ba'])


pipeline {
  agent none
  environment {
    // Global vars
    CI = true
    BASE_DIR = "."
    CI_DIR = "./.ci"
    GROOVY_SRC = "${CI_DIR}/src/groovy"
    HOME = "${JENKINS_HOME}"  // /var/lib/jenkins
    MAIN_CACHE_DIR = "${JENKINS_HOME}/.kibana" // /var/lib/jenkins/.kibana
    BOOTSTRAP_CACHE_DIR = "${MAIN_CACHE_DIR}/bootstrap_cache" // /var/lib/jenkins/.kibana/bootstrap_cache
    WORKSPACE_DIR = "${JENKINS_HOME}/workspace" // /var/lib/jenkins/workspace
    WORKSPACE_CACHE_DIR = "${MAIN_CACHE_DIR}/workspace_cache" // /var/lib/jenkins/.kibana/workspace_cache
    WORKSPACE_CACHE_NAME = "JOB_NAME-${JOB_NAME}-BUILD_ID-${BUILD_ID}.tgz"
    // /var/lib/jenkins/.kibana/workspace_cache/JOB_NAME-SOMEBRANCHNAME-BUILD_ID-SOMEBUILDNUMBER.tgz
    FULL_WORKSPACE_CACHE_PATH = "${WORKSPACE_CACHE_DIR}/${WORKSPACE_CACHE_NAME}"
    TEMP_PIPELINE_SETUP_DIR = "src/dev/temp_pipeline_setup"
    // PR_SOURCE_BRANCH = "${ghprbSourceBranch}"
    // PR_TARGET_BRANCH = "${ghprbTargetBranch}"
    // PR_AUTHOR = "${ghprbPullAuthorLogin}"
    CREDENTIALS_ID ='kibana-ci-gcs-plugin'
    BUCKET = "gs://kibana-ci-artifacts/jobs/${JOB_NAME}/${BUILD_NUMBER}"
    PATTERN = "${FULL_WORKSPACE_CACHE_PATH}"
  }
  stages {
    stage('Install All-The-Things') {
      agent { label 'linux && immutable' }
      steps {
        dir("${env.BASE_DIR}"){
          sh "${CI_DIR}/run_pipeline.sh"
          // script {
          //   def d = load("${env.GROOVY_SRC}/dump.groovy")
          //   def t = load("${env.GROOVY_SRC}/tar.groovy")
          //   d.dumpEnv()
          //   createWorkspaceCache()
          //   t.tarAll()
          //   d.dumpSizes(["${env.WORKSPACE}", "${env.WORKSPACE_DIR}/elasticsearch", "${env.FULL_WORKSPACE_CACHE_PATH}"])
          // }
          // step([$class: 'ClassicUploadStep',
          //   credentialsId: env.CREDENTIALS_ID, bucket: env.BUCKET, pattern: env.PATTERN])
        }
      }
    }
    stage('kibana-intake') {
      agent { label 'linux || immutable' }
      // options { skipDefaultCheckout() }
      steps {
        script {
          createWorkspaceCache()
        }
        step([$class: 'DownloadStep', credentialsId: env.CREDENTIALS_ID,  bucketUri: "gs://kibana-ci-artifacts/jobs/${JOB_NAME}/${BUILD_ID}/var/lib/jenkins/.kibana/workspace_cache/JOB_NAME-kibana-automation-pipeline-BUILD_ID-${BUILD_ID}.tgz", localDirectory: "${WORKSPACE_CACHE_DIR}"])
        unTar()
//        dir("${WORKSPACE}"){
//          sh './test/scripts/jenkins_unit.sh'
//        }
      }
    }
    stage('Component Integration Tests') {
      agent { label 'linux || immutable' }
      options { skipDefaultCheckout() }
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Functional Tests') {
      agent { label 'linux || immutable' }
      options { skipDefaultCheckout() }
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
    stage('Finish') {
      agent { label 'linux || immutable' }
      options { skipDefaultCheckout() }
      steps {
        sh 'echo "Not implemented yet"'
      }
    }
  }
}
def clearDir(String x){
  dir(x){
    sh 'rm -rf ./*'
  }
}
def createWorkspaceCache(){
  sh "mkdir -p ${WORKSPACE_CACHE_DIR}"
}
}

/**
  unstash the stash passed as parameter or execute the block code passed.
  This works as a cache that make the retrieve process only once, the rest of times
  unstash the stuff.
*/
def useCache(String name, Closure body){
  def isCacheUsed = false
  try{
    unstash name
    isCacheUsed = true
  } catch(error){
    body()
    currentBuild.result = "SUCCESS"
  }
  return isCacheUsed
}

/**
  Archive result files.
*/
def grabTestResults(){
  junit(allowEmptyResults: true,
    keepLongStdio: true,
    testResults: "${BASE_DIR}/**/target/junit/**/*.xml")
  archiveArtifacts(allowEmptyArchive: true,
    artifacts: "${BASE_DIR}/x-pack/test/functional/apps/reporting/reports/session/*.pdf,${BASE_DIR}/x-pack/test/functional/failure_debug/html/*.html,${BASE_DIR}/x-pack/test/**/screenshots/**/*.png,${BASE_DIR}/test/functional/failure_debug/html/*.html,${BASE_DIR}/test/**/screenshots/**/*.png,${BASE_DIR}/target/kibana-*",
    onlyIfSuccessful: false)
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

/**
  install NodeJs, it uses stash as cache.

  see how to we can grab the cache from ~/.npm/_cacache
*/
def installNodeJs(nodeVersion, pakages = null){
  nodeEnviromentVars(nodeVersion)
  useCache('nodeJs'){
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
    pakages?.each{ pkg ->
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
  Get Elasticsearch sources, it uses stash as cache.
*/
def checkoutES(){
//  useCache('es-source'){
    dir("${ES_BASE_DIR}"){
      checkout([$class: 'GitSCM', branches: [[name: "${params.ES_VERSION}"]],
        doGenerateSubmoduleConfigurations: false,
        extensions: [[$class: 'CloneOption',
          depth: 1,
          noTags: false,
          reference: "/var/lib/jenkins/.git-references/elasticsearch.git",
          shallow: true
          ]],
        submoduleCfg: [],
        userRemoteConfigs: [[credentialsId: "${JOB_GIT_CREDENTIALS}",
        url: "${ES_GIT_URL}"]]])
    }
//    stash allowEmpty: true, name: 'es-source', includes: "${ES_BASE_DIR}/**", excludes: ".git", useDefaultExcludes: false
//  }
}

/**
  Get Kibana sources, it uses stash as cache.
  also, define NODE_VERSION, and YARN_VERSION environment variables.
  It modifies the path to add the `yarn bin` folder.
  It executes `yarn kbn bootstrap` and stash the reults.
*/
def checkoutKibana(){
//  useCache('source'){
    gitCheckout(basedir: "${BASE_DIR}", branch: params.branch_specifier,
      repo: "${GIT_URL}",
      credentialsId: "${JOB_GIT_CREDENTIALS}",
      reference: "/var/lib/jenkins/.git-references/kibana.git")
//    stash allowEmpty: true, name: 'source', excludes: "${BASE_DIR}/.git,node/**", useDefaultExcludes: false
//  }

  dir("${BASE_DIR}"){
    def packageJson = readJSON(file: 'package.json')
    env.NODE_VERSION = packageJson.engines.node
    env.YARN_VERSION = packageJson.engines.yarn
  }

  installNodeJs("${NODE_VERSION}", ["yarn@${YARN_VERSION}"])

  dir("${BASE_DIR}"){
    def yarnBinPath = sh(script: 'yarn bin', returnStdout: true)
    env.PATH="${env.PATH}:${yarnBinPath}"
  }

  def isCacheUsed = useCache('cache'){
    firstTime = true
    dir("${BASE_DIR}"){
      sh 'yarn kbn bootstrap'
    }
    stash allowEmpty: true, name: 'cache',
      includes: "${BASE_DIR}/node_modules/**,${BASE_DIR}/optimize/**,${BASE_DIR}/target/**,${BASE_DIR}/packages/**,${BASE_DIR}/x-pack,${BASE_DIR}/test",
      useDefaultExcludes: false
  }
  if(isCacheUsed){
    dir("${BASE_DIR}"){
      sh 'yarn kbn bootstrap'
    }
  }
}

/**
  build the Kibana OSS.
*/
def buildOSSSteps(){
  useCache('build-oss'){
    checkoutKibana()
    dir("${BASE_DIR}"){
      sh '''#!/bin/bash
      set -euxo pipefail
      babel --version
      node scripts/build --debug --oss --skip-archives --skip-os-packages
      '''
    }
    stash allowEmpty: true, name: 'build-oss', excludes: "${BASE_DIR}/.git,node/**", useDefaultExcludes: false
  }
}

/**
  build the Kibana No OSS.
*/
def buildNoOSSSteps(){
  useCache('build-no-oss'){
    checkoutKibana()
    dir("${BASE_DIR}"){
      sh 'node scripts/build --debug --no-oss --skip-os-packages'
    }
    stash allowEmpty: true, name: 'build-no-oss', excludes: "${BASE_DIR}/.git,node/**", useDefaultExcludes: false
  }

  useCache('kibana-bin'){
    dir("${BASE_DIR}"){
      sh '''#!/bin/bash
      set -euxo pipefail
      linuxBuild="$(find "./target" -name 'kibana-*-linux-x86_64.tar.gz')"
      installDir="${WORKSPACE}/install/kibana"
      mkdir -p "${installDir}"
      tar -xzf "${linuxBuild}" -C "${installDir}" --strip=1
      '''
    }
    stash allowEmpty: true, name: 'kibana-bin', includes: "install/kibana/**", useDefaultExcludes: false
  }
}

/**
  Some quick Test to run before anything else.
*/
def quickTest(){
  dir("${BASE_DIR}"){
    sh 'yarn tslint x-pack/plugins/apm/**/*.{ts,tsx} --fix'
    sh 'cd x-pack/plugins/apm && yarn tsc --noEmit'
    sh 'cd x-pack && node ./scripts/jest.js plugins/apm'
  }
}

def kibanaIntakeSteps(){
  checkoutKibana()
  dir("${BASE_DIR}"){
    sh '''#!/bin/bash
    set -euxo pipefail
    grunt jenkins:unit --from=source --dev || echo -e "\033[31;49mTests FAILED\033[0m"
    '''
  }
}

def kibanaGroupSteps(){
  buildOSSSteps()
  checkoutES()
  dir("${BASE_DIR}"){
    def parallelSteps = [:]
    def groups = (1..12)
    sh '''#!/bin/bash
    set -euxo pipefail
    grunt functionalTests:ensureAllTestsInCiGroup || echo -e "\033[31;49mTests FAILED\033[0m"
    '''

    parallelSteps['pluginFunctionalTestsRelease'] = {sh '''#!/bin/bash
    set -euxo pipefail
    grunt run:pluginFunctionalTestsRelease --from=source || echo -e "\033[31;49mTests FAILED\033[0m"
    '''}

    groups.each{ group ->
      parallelSteps["functionalTests_ciGroup${group}"] ={sh """#!/bin/bash
      set -euxo pipefail
      grunt "run:functionalTests_ciGroup${group}" --from=source || echo -e "\033[31;49mTests FAILED\033[0m"
      """}
    }
    parallel(parallelSteps)
  }
}

def xPackIntakeSteps(){
  checkoutKibana()
  dir("${XPACK_DIR}"){
    def parallelSteps = [:]
    parallelSteps['Mocha tests'] = {sh 'yarn test'}
    parallelSteps['Jest tests'] = {sh 'node scripts/jest --ci --no-cache --verbose'}
    parallel(parallelSteps)
  }
}

def xPackGroupSteps(){
  buildNoOSSSteps()
  dir("${XPACK_DIR}"){
    def parallelSteps = [:]
    def groups = (1..6)
    def funTestGroups = (1..12)

    groups.each{ group ->
      parallelSteps["ciGroup${group}"] = {
        sh "node scripts/functional_tests --assert-none-excluded --include-tag 'ciGroup${group}'"
      }
    }
    funTestGroups.each{ group ->
      parallelSteps["functional and api tests ciGroup${group}"] = {
        sh "node scripts/functional_tests --debug --bail --kibana-install-dir '${INSTALL_DIR}' --include-tag 'ciGroup${group}'"
      }
    }
    parallel(parallelSteps)
  }
}
