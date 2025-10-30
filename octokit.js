/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { Octokit } = require('@octokit/rest');
const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
async function main() {
  const content = await github.rest.repos.getContent({
    mediaType: {
      format: 'application/vnd.github.VERSION.raw',
    },
    owner: 'elastic',
    repo: 'kibana',
    path: '/FAQ.md',
    ref: '9.1',
  });
  console.log(content);
}

main();
