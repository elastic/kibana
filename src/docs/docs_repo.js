/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
