/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { GithubApi } from '../../../src/dev/prs/github_api';

const parseTarget = process.argv[2] ?? 'BUILDKITE_MESSAGE';
console.log(`\n### parseTarget: \n  ${parseTarget}`);

console.log(`\n### process.env.BUILDKITE_MESSAGE:
${process.env[parseTarget]}`);

export {};
