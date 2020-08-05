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

import { resolve } from 'path';

const kibanaDir = resolve(__dirname, '..', '..');

export function buildDocsScript(cmd) {
  return resolve(process.cwd(), cmd.docrepo, 'build_docs');
}

export function buildDocsArgs(cmd) {
  const docsIndexFile = resolve(kibanaDir, 'docs', 'index.asciidoc');
  let args = ['--doc', docsIndexFile, '--direct_html', '--chunk=1'];
  if (cmd.open) {
    args = [...args, '--open'];
  }
  return args;
}

export function defaultDocsRepoPath() {
  return resolve(kibanaDir, '..', 'docs');
}
