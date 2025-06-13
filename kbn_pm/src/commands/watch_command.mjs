/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Bazel from '../lib/bazel.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'watch',
  description: 'Runs a build in the Bazel built packages and keeps watching them for changes',
  flagsHelp: `
    --offline            Run the installation process without consulting online resources. This is useful and
                          sometimes necessary for using bootstrap on an airplane for instance. The local caches
                          will be used exclusively, including a yarn-registry local mirror which is created and
                          maintained by successful online bootstrap executions.
  `,
  reportTimings: {
    group: 'scripts/kbn watch',
    id: 'total',
  },

  async run({ args, log }) {
    await Bazel.watch(log, {
      offline: args.getBooleanValue('offline') ?? true,
      reactVersion: process.env.REACT_18 ? '18' : '17',
      // Default to true when EUI_AMSTERDAM is not set on 8.19
      // TODO: Remove when Kibana 8.19 is EOL and Amsterdam backports aren't needed anymore
      // https://github.com/elastic/kibana/issues/221593
      euiAmsterdam: !process.env.EUI_AMSTERDAM || process.env.EUI_AMSTERDAM === 'true',
    });
  },
};
