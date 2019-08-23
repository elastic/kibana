/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { resolve } = require('path');

// force cwd
process.chdir(resolve(__dirname, '../../..'));

if (!process.env.JOB_NAME) {
  console.log('Unable to determine job name');
  process.exit(1);
}

// JOB_NAME is formatted as `elastic+kibana+7.x` in some places and `elastic+kibana+7.x/JOB=kibana-intake,node=immutable` in others
const branch = process.env.GIT_BRANCH;

// TODO fix below after we figure out naming conventions, etc for new pipeline job
// See below for list of env vars that could be helpful
/*
BUILD_DISPLAY_NAME=#18
BUILD_ID=18
BUILD_NUMBER=18
BUILD_TAG=jenkins-kibana-automation-pipeline-brianseeders-18
GIT_BRANCH=jenkins-pipeline-cigroups
JOB=kibana-ciGroup11
JOB_BASE_NAME=kibana-automation-pipeline-brianseeders
JOB_NAME=kibana-automation-pipeline-brianseeders
PR_AUTHOR=brianseeders
PR_SOURCE_BRANCH=jenkins-pipeline-cigroups
PR_TARGET_BRANCH=master
STAGE_NAME=kibana-ciGroup11
ghprbActualCommit=0707c3faaa9249978d5bde958f3c1ff6659fd5fa
ghprbActualCommitAuthor=Brian Seeders
ghprbActualCommitAuthorEmail=brian.seeders@elastic.co
ghprbAuthorRepoGitUrl=https://github.com/brianseeders/kibana.git
ghprbCommentBody=null
ghprbCredentialsId=2a9602aa-ab9f-4e52-baf3-b71ca88469c7
ghprbGhRepository=brianseeders/kibana
ghprbPullAuthorLogin=brianseeders
ghprbPullAuthorLoginMention=@brianseeders
ghprbPullDescription=GitHub pull request #8 of commit 0707c3faaa9249978d5bde958f3c1ff6659fd5fa, no merge conflicts.
ghprbPullId=8
ghprbPullLink=https://github.com/brianseeders/kibana/pull/8
ghprbPullTitle=Jenkins pipeline cigroups
ghprbSourceBranch=jenkins-pipeline-cigroups
ghprbTargetBranch=master
sha1=origin/pr/8/merge
*/

// const [org, proj, branch] = process.env.JOB_NAME.split(/\+|\//);
const masterOrVersion = branch === 'master' || branch.match(/^\d+\.(x|\d+)$/);
//if (!(org === 'elastic' && proj === 'kibana' && masterOrVersion)) {
if (!masterOrVersion) {
  console.log('Failure issues only created on master/version branch jobs');
  process.exit(0);
}

require('../../setup_node_env');
require('./report').reportFailedTests();
