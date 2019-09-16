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

// JOB_NAME is formatted as `elastic+kibana+7.x` in some places and `elastic+kibana+7.x/JOB=kibana-intake,node=immutable` in others

const jobNameSplit = (process.env.JOB_NAME || '').split(/\+|\//);
const branch = jobNameSplit.length >= 3 ? jobNameSplit[2] : process.env.GIT_BRANCH;

const isPr = !!process.env.ghprbPullId;

if (!branch) {
  console.log('Unable to determine originating branch from job name or other environment variables');
  process.exit(1);
}

const isMasterOrVersion = branch.match(/^(origin\/){0,1}master$/) || branch.match(/^(origin\/){0,1}\d+\.(x|\d+)$/);

if (!isMasterOrVersion || isPr) {
  console.log('Failure issues only created on master/version branch jobs');
  process.exit(0);
}

require('../../setup_node_env');
require('./report').reportFailedTests();
