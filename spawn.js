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


const { spawn } = require('child_process');

const cmd = process.argv[2];
const cmdArgs = process.argv.slice(3);
const cmdSpawnConfig = { cwd: __dirname, stdio: 'inherit' };

//todo check env vars
//todo - fire api request
//get title
const ls = spawn(cmd, cmdArgs, cmdSpawnConfig);

//todo - fire api request before exiting
// determine success or failure
ls.on('close', process.exit);
