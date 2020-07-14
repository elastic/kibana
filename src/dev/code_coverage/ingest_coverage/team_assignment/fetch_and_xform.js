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

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { pretty, noop } from '../utils';
import { fromNullable } from '../either';
import { update } from './update_ingest_pipeline.js';
import { default as jsonDef } from './ingestion_pipeline.json';

const ROOT = resolve(__dirname, '../../../../..');
const resolveFromRoot = resolve.bind(null, ROOT);
const scriptPath = resolveFromRoot(
  'src/dev/code_coverage/ingest_coverage/team_assignment/ingestion_pipeline.painless.java'
);
const getContents = (scriptPath) => readFileSync(scriptPath, 'utf8');
const prettyJsonAndScriptContents = jsonAndScript(pretty)(jsonDef);

export const prokTeamAssignment = (log) =>
  fromNullable(scriptPath)
    .map(getContents)
    .map(prettyJsonAndScriptContents)
    .map(transform)
    .fold(noop, (xformed) => update(log)(xformed));

function jsonAndScript(formatter) {
  return (jsonDef) => (scriptContents) => [formatter(jsonDef.team_assignment), scriptContents];
}

const sourceStanzaRe = /("source"\s*:\s*)("")/;

const formatted = (contents) => `$1"""
${contents}"""`;

function transform([jsonStructure, scriptContents]) {
  return jsonStructure.replace(sourceStanzaRe, formatted(scriptContents));
}
